# Chat titles

Every assistant chat gets a short automatic title for list rows and headers; users can rename; soft-deleted chats keep their last title for
admin inspect.

## Behavior

Chat list UIs and headers show a short title. When none exists yet, the UI shows a localized “Ohne Titel / Untitled” label (list) or “Neuer
Chat / New chat” (compose header).

After the conversation has meaningful content, a background job summarizes the first user-and-assistant exchange into at most six words in
the language of the chat, then saves that title. **Manual rename** (`chatTitleUpdate`) sets a non-empty title (max 60) and locks further
auto-titling.

Fresh titles are pushed via `userUpdates` after the titler persists (and after rename/delete). The assistant sidebar and full-screen owner
chat page refetch title/list on that ping; other surfaces pick up on the next fetch.

## Decisions

### Alternatives considered

**When to run the titler**

| Option                                                   | Why not                                                                                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| After the first user message only                        | Titles from “hi” or “what can you do?” are useless without an assistant reply to summarize.   |
| Inline at the end of message send                        | Adds model latency to the “message done” moment and couples titling failure to the chat path. |
| Every turn until the user renames                        | Overwrites a good early title as the topic shifts; noisy in lists.                            |
| After each assistant turn while the title is still empty | Retries when the first exchange had no topic; stops once a real topic is written.             |

**Filtering no-signal exchanges (“hey”, “hey there”)**

| Option                                                | Why not                                                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Skip when concatenated text is under N characters     | Mis-fires on short but titleable prompts; lets long empty greetings through.                                               |
| Regex / classifier for greetings                      | Fragile per language; the titler model is a better judge at this scale.                                                    |
| Ask the model to return `NONE` when there is no topic | One branch in the handler; leaves title empty so the next assistant turn retries. Self-corrects when a real topic appears. |

**Language**

Paired German/English title columns were rejected: one chat is held in one language, and translating the title wastes a call nobody reads.
Editable bilingual records use paired columns elsewhere; conversation titles do not.

**Delivery to the UI**

`userUpdates` after a successful title write (titler + rename) is enough for the sidebar list/header. A dedicated title channel was
rejected.

### Chosen

Run the titler after each assistant turn while the title is still empty; treat `NONE` as “try again next turn”; store a single title in the
conversation’s language; publish `userUpdates` on persist; owner rename locks auto-title.

## Next steps

- **Retitle after topic drift** — Optional re-run on a schedule if stale titles become a list UX problem.

## Implementation

### Model

`serverRuntime.ai.chatTitlerModel()` — cheapest catalog tier (`gemini-3.5-flash-lite`). Wired in
[`serverRuntimeCreate.ts`](../../src/server/domain/serverRuntimeCreate.ts).

### Titles + soft-delete

- Normalize/truncate: [`chatTitle.ts`](../../src/server/domain/chatTitle.ts) (`CHAT_TITLE_MAX_LENGTH = 60`)
- Rename: [`chatTitleUpdate.ts`](../../src/server/commands/chatTitleUpdate.ts)
- Soft-delete: [`chatDelete.ts`](../../src/server/commands/chatDelete.ts) — stamps `Chats.deletedAt`

### Job

`chatTitleGenerate` (`src/server/jobs/handlers/chatTitleGenerate.ts`) — queued `{ chatId }`. Handler:

1. **Idempotent short-circuit.** Non-empty title → return (covers redelivery, manual rename, re-enqueue after success).
2. **Load the first exchange.** Earliest user body and earliest assistant text, oldest first.
3. **Call the titler.** Structured `{ title }`. System prompt: `NONE` if no topic; else ≤ 6 words, ≤ 50 chars, conversation language, no
   quotes or trailing punctuation. Record on `AiGenerations` (`CHAT_TITLE`) via `serverRuntime.aiGenerations.record()` — see
   [ai-generations.md](../architecture/ai-generations.md).
4. **`NONE`.** Leave title empty; next assistant turn re-enqueues.
5. **Persist.** Trim, truncate to 60 chars, update only where title is still empty (race-safe).
6. **Publish.** `userUpdates` for the chat owner when a title row was written.
7. **Errors logged, not propagated.** pg-boss `retryLimit: 2`; organic retry on the next assistant turn.

### Enqueue site

`chatTurnRun` in [`chatTurnRun.ts`](../../src/server/lib/chatTurnRun.ts) — after a turn finishes with status `complete`. Fire-and-forget
enqueue; failures log only. Idempotency bounds cost once a title exists. Turns that pause at `awaitingInput` do not enqueue until they later
complete.

Related: [assistant-sidebar.md](./assistant-sidebar.md), [chat-persistence.md](../architecture/chat-persistence.md),
[admin-ai-generations.md](./admin-ai-generations.md).
