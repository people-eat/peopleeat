# Audience assistants

Separate AI assistants for customers, cooks, admins, and booking intake so prompts and tools can diverge without one shared mega-agent.

## Behavior

Each surface gets an assistant matched to the job:

- **Customer profile rail** — Help with bookings, finding chefs, and profile questions.
- **Cook profile rail** — Help with profile, menus, offers, and open requests.
- **Admin rail** — Help with users, approvals, and support context while working in admin.
- **Booking request form** — Conversational help while filling or refining a request (when wired).

`chatTurnAgentCreate` dispatches by `Chat.surface`. Admin ships booking-request / user / meal / menu / support-request / gift-card /
testimonial list tools plus `promptUserForInput`. Cook ships meal create / profile update tools with a cook state snapshot in the system
prompt. Customer remains scaffolded. Tool-loop agents reply in markdown — Gemini cannot combine `Output.object` (JSON mime type) with
function calling. Admin list cards are persisted as `admin.bookingRequestList` / `admin.userList` / `admin.mealList` / `admin.menuList` /
`admin.supportRequestList` / `admin.giftCardList` / `admin.testimonialList` data parts from the matching tool result. Each list tool accepts
an optional primary-key id array for follow-up drill-in on the same tool — no separate find-one tools. Optional `detail: summary | evidence`
(default `summary`) keeps model context lean: cards stay in the data parts for the UI; the persisted tool output is rewritten to
count/ids/meta unless the call requested `evidence`.

## Next steps

1. Connect customer profile rail to persist + stream with its factory ([assistant-sidebar.md](./assistant-sidebar.md)).
2. Grow cook tools (menus, offers, pool) and further admin tools (offers, approvals).
3. Attach the booking-request factory when the form (or side panel) needs conversational intake.
4. Add audience-specific tools on commands as each surface gains mutations to call.

## Implementation

### Factory status

| Factory                     | File                                             | Intended surface      | Status                                                                                                         |
| --------------------------- | ------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `agentCustomerCreate`       | `src/server/agents/agentCustomerCreate.ts`       | Customer profile rail | **Scaffold** — empty tools                                                                                     |
| `agentCookCreate`           | `src/server/agents/agentCookCreate.ts`           | Cook profile rail     | **Wired** — `cookMealCreate`, `cookUpdate`, snapshot                                                           |
| `agentAdminCreate`          | `src/server/agents/agentAdminCreate.ts`          | Admin rail            | **Wired** — booking / user / meal / menu / support / gift-card / testimonial list tools + `promptUserForInput` |
| `agentBookingRequestCreate` | `src/server/agents/agentBookingRequestCreate.ts` | Booking request form  | **Scaffold** — empty tools                                                                                     |

Dispatch: `src/server/lib/chatTurnAgentCreate.ts`.

### Scaffold shape

Customer/cook factories historically returned empty `tools: {}`. Cook now wires colocated command tools and inlines
`cookAssistantStateSnapshotRead` into instructions. Customer remains a scaffold until its catalog lands.

### Per-agent models (`ServerRuntime.ai`)

Defaults in `serverRuntimeCreate`; optional `modelId` per call overrides.

| Agent factory               | Runtime slot                      | Default            |
| --------------------------- | --------------------------------- | ------------------ |
| `agentCustomerCreate`       | `ai.customerAssistantModel`       | `gemini-2.5-flash` |
| `agentCookCreate`           | `ai.cookAssistantModel`           | `gemini-2.5-flash` |
| `agentAdminCreate`          | `ai.adminAssistantModel`          | `gemini-2.5-flash` |
| `agentBookingRequestCreate` | `ai.bookingRequestAssistantModel` | `gemini-2.5-flash` |

Assistant factories are chat-only. One-shot generations use dedicated slots (`chatTitlerModel`, `cookBiographySuggestModel`, …) — see
[ai-generations.md](../architecture/ai-generations.md) and [chat-titles.md](./chat-titles.md).

See also [chat.md](./chat.md), [architecture/chat.md](../architecture/chat.md),
[architecture/chat-persistence.md](../architecture/chat-persistence.md), [styles/chat.md](../styles/chat.md).
