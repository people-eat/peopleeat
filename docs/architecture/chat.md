# Chat Foundation

## Context

peopleeat needs assistant chats (admin / customer / cook) plus human offer and support threads. Assistant chats share durable turn
execution, streaming parts, tool approvals, and structured input collection. Offer and support stay on their domain tables and project to a
separate human message union — they are not unified into assistant turns.

Persistence and LLM replay: [Chat Persistence](./chat-persistence.md). Presentation: [styles/chat.md](../styles/chat.md).

## Decision

### Assistant: turns + parts

Assistant conversations are modeled as **chats → turns → messages (JSONB parts)**:

```graphql
type Chat {
  chatId: ID!
  surface: ChatSurface!
  title: String!
  turns: [ChatTurn!]!
  # …
}

type ChatTurn {
  chatTurnId: ID!
  status: ChatTurnStatus! # QUEUED | RUNNING | AWAITING_INPUT | COMPLETE | FAILED | CANCELLED
  revision: Int!
  userMessage: ChatMessage!
  assistantMessage: ChatMessage!
  # usage / failure / model metadata when present
}

type ChatMessage {
  chatMessageId: ID!
  role: ChatMessageRole! # USER | ASSISTANT
  status: ChatMessageStatus!
  revision: Int!
  parts: [ChatMessagePart!]!
  attachments: [FileUpload!]!
}

union ChatMessagePart =
  | ChatMessageTextPart
  | ChatMessageReasoningPart
  | ChatMessageToolPart
  | ChatMessageSourceUrlPart
  | ChatMessageSourceDocumentPart
  | ChatMessageFilePart
  | ChatMessageDataPart
```

- One turn = one user message + one assistant message (`UNIQUE(chatTurnId, role)`).
- At most one non-terminal turn per chat (partial unique index).
- `clientRequestId` makes create / continue mutations idempotent.
- Live updates use `chatTurnUpdates(chatId)` with lean wire `{ chatId, chatTurnId, revision }`; the subscription resolver reloads the
  aggregate (pg_notify size cap). Clients merge by revision (`useChatTurnLiveUpdates`).
- Tool lifecycle (including AI SDK `toolApproval`) lives on a single `ChatMessageToolPart` through input → approval → output states.
- `promptUserForInput` pauses the turn at `AWAITING_INPUT`; slot typing is Zod + UI only (not GraphQL unions). Continue via
  `chatInputCollectionRespond` with opaque JSON answers.
- Chef card lists are `data` parts with `dataType: "chef.cardList"`.
- Admin list tools materialize `data` parts in `chatMessageAiAdapter` (`expandAdminListToolParts`):
  - `admin.bookingRequestList` ← `adminBookingRequestsFindMany` → `AdminBookingRequestListCard`
  - `admin.userList` ← `adminUsersFindMany` → `AdminUserListCard`
  - `admin.mealList` ← `adminCookMealsFindMany` → `CookMealCard` (`ChatCardList` upToTwo: 1 → 2 @ 36rem)
  - `admin.menuList` ← `adminCookMenusFindMany` → `CookMenuCard` (`ChatCardList` upToTwo: 1 → 2 @ 36rem)
  - `admin.supportRequestList` ← `adminSupportRequestsFindMany` → `SupportRequestSummaryCard`
  - `admin.giftCardList` ← `adminGiftCardsFindMany` → `AdminGiftCardListCard`
  - `admin.testimonialList` ← `adminTestimonialsFindMany` → `AdminTestimonialListCard` Booking / user / chef / support / gift-card /
    testimonial grids use responsive `ChatCardList` (1 → 2 @ 28rem → 3 @ 42rem). Tool input/output JSON is never inline; it lives behind
    `ToolArgumentsButton` (hover-revealed args icon → Input/Output dialog). Admins always receive tool `debug` on turns.
- Step-start parts may exist in storage for model-history adapters but are not exposed on GraphQL.

Domain types: `src/server/domain/chatMessageBody.ts`, `chatTurn.ts`. Runtime: `chatTurnRun` / `chatTurnRecover` /
`chatTurnUpdatesSubscribe`.

### Human: offer / support stay domain-shaped

```graphql
union HumanChatMessage = ChatMessageUser | ChatMessageBookingRequestOfferEvent
```

Offer free-text and support messages project to `ChatMessageUser`. Offer timeline events project to `ChatMessageBookingRequestOfferEvent`.
Domain fields keep `messages: [HumanChatMessage!]!` — not `ChatTurn`.

`ChatMessageUser` carries `author`, `isOwn`, wire-only `showCopyButton` / `collapseLongBody`, `attachments`, and `reactions` (emoji
overlays; WhatsApp Concierge today, empty elsewhere). On admin offer chat, `isOwn` also puts cook on the right rail with admin (customer
left) — see [booking-offer-chat.md](../features/booking-offer-chat.md). Attachments still use the shared [`FileUploads`](./file-storage.md)
store.

### Mutations (assistant)

| Mutation                     | Role                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `chatMessageCreate`          | Create turn + user + pending assistant (or free-text pivot while awaiting input) |
| `chatToolApprovalRespond`    | Continue turn after tool approval                                                |
| `chatInputCollectionRespond` | Continue turn after `promptUserForInput` answers                                 |

All take `clientRequestId` and `assistantOptions` (e.g. require tool approvals).

### Audience agents

Surface (`admin` | `customer` | `cook`) selects the agent factory when the turn runner starts. Dispatch lives in `chatTurnAgentCreate`.

### Label-only select options

`promptUserForInput` select options are natural-language labels only. The model maps answered labels back to tool enums itself. CamelCase
identifiers that slip through are humanized before persistence.

## Consequences

- Assistant UI renders parts (text / reasoning / tool / data), not a per-variant message forest.
- Offer/support UIs keep `HumanChatMessage` and are unaffected by turn status / revision merge.
- Hard cut: no dual-write with the old variant tables; empty / non-production data assumed.
- Orphan `queued` / `running` turns are marked failed on GraphQL server startup (`chatTurnRecover`).

## Related

- [chat-persistence.md](./chat-persistence.md)
- [chat-titles.md](../features/chat-titles.md)
- [assistant-sidebar.md](../features/assistant-sidebar.md)
- [assistants.md](../features/assistants.md)
- [state-synchronization.md](./state-synchronization.md)
