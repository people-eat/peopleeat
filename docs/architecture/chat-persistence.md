# Chat Persistence

Companion to [Chat Foundation](./chat.md). That doc decides the GraphQL / domain shape; this one decides how assistant turns are stored and
replayed to the LLM. Offer and support messages stay on their domain tables and are out of scope here.

## Context

Assistant execution continues on the server after the mutation returns and after the browser leaves. A conversation must preserve partial
text, reasoning, multi-step tools (including approvals), and structured input pauses in a form that both renders in the UI and becomes model
history for the next turn.

## Decision

### Turns are the execution aggregate

```text
chats
  chatId, userId, surface, title, deletedAt, lastModifiedAt, createdAt

chatTurns
  chatTurnId PK
  chatId FK
  clientRequestId UNIQUE
  sequence IDENTITY          -- authoritative order within a chat
  status                     -- queued | running | awaitingInput | complete | failed | cancelled
  revision
  locale?, agentName?, modelId?, finishReason?
  usage jsonb?
  failureCode?
  startedAt?, completedAt?
  lastModifiedAt, createdAt
  -- partial unique: one non-terminal turn per chat

chatMessages
  chatMessageId PK
  chatTurnId FK
  role                       -- user | assistant; UNIQUE(chatTurnId, role)
  status                     -- pending | streaming | complete | failed | cancelled
  revision
  body jsonb                 -- ChatMessageBody { version, parts[] }
  lastModifiedAt, createdAt

chatMessageUserAttachments
  chatMessageId FK → chatMessages, fileUploadId FK → fileUploads, position
```

Migration: `drizzle/0004_chat_turns.sql` (hard cut — drops the old per-variant forest).

`chats.title` is authored by the `chatTitleGenerate` job after each **complete** turn while the title is still empty. See
[`chat-titles.md`](../features/chat-titles.md).

### JSONB body owns parts; relational columns own lifecycle

`ChatMessageBody` parts: `text`, `reasoning`, `tool`, `sourceUrl`, `sourceDocument`, `file`, `data`, and optionally `stepStart` (storage /
adapter only). Tool input/output and approval state live on the tool part. `chef.cardList` and admin list types (`admin.bookingRequestList`,
`admin.userList`, `admin.mealList`, `admin.menuList`) are `data` parts.

Slot schemas for `promptUserForInput` remain in Zod (`toolPromptUserForInput`) and `chatPayloadTypes` — not GraphQL unions.

### Runner behavior

`chatTurnRun` (`src/server/lib/chatTurnRun.ts`):

1. Claim `queued` → `running`.
2. Build history from prior **complete** turns + current user (+ assistant body when continuing).
3. Stream agent snapshots: coalesce ordinary text persist (~75ms); persist immediately on structural part changes; publish `chatTurnUpdates`
   only after commit.
4. Finish → `awaitingInput` when a tool needs approval / `promptUserForInput`, else `complete`.
5. On error → `failed` (`TURN_EXECUTION_FAILED`). Startup `chatTurnRecover` marks orphan queued/running as failed (`TURN_INTERRUPTED`).

Agent boundary: `chatMessageAiAdapter` converts AI SDK streams ↔ `ChatMessageBody` / `ModelMessage[]`.

### Live updates

Wire payload is lean (`chatId`, `chatTurnId`, `revision`). Subscription reloads the turn aggregate before delivery — see
[state-synchronization.md](./state-synchronization.md) and [chat.md](./chat.md).

### Attachments

User-role messages may reference `FileUploads` via `chatMessageUserAttachments`. Replay folds bytes into AI SDK `FilePart` (mediaType).
Assistant attachments are not first-class on the new spine; file **parts** in the body cover model-emitted files.

## Alternatives considered

- Flat message list — cannot express turn concurrency, idempotency, failure, or usage cleanly.
- Per-variant relational tables (previous model) — rich FKs but a forest of joins and delta subscriptions; replaced by turn + parts.
- Dual-write / soft cutover — rejected; no production assistant data to preserve.
- Unifying offer/support into `ChatTurns` — rejected; those domains keep their own tables and `HumanChatMessage`.

## Consequences

- PostgreSQL is authoritative; pub-sub only notifies after commit.
- Re-entering a page restores the latest partial or terminal assistant message without the original browser request.
- Continuing a provider request across process crash is out of scope; orphans fail and the user can send again.
- Raw tool debug in GraphQL resolves only when the subscription requests debug (development).
