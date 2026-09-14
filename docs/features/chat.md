# Chat surfaces

Index of where chat documentation lives — not a separate product surface.

## Behavior

Chat is shared infrastructure across assistant rails, offer negotiation, and support. Use the table below instead of duplicating rules here.

| Concern                                                                    | Doc                                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desired experience (shared chrome + assistant vs human scroll modes)       | [`docs/styles/chat.md`](../styles/chat.md)                                                                                                                                                               |
| Message model, streaming, live updates, HITL tool approvals                | [`docs/architecture/chat.md`](../architecture/chat.md)                                                                                                                                                   |
| DB shape, history replay, attachments persistence + client upload pipeline | [`docs/architecture/chat-persistence.md`](../architecture/chat-persistence.md)                                                                                                                           |
| Auto-generated chat titles                                                 | [`docs/features/chat-titles.md`](./chat-titles.md)                                                                                                                                                       |
| Attachments (persist + upload → render → replay)                           | [`docs/architecture/chat-persistence.md#attachments`](../architecture/chat-persistence.md#attachments)                                                                                                   |
| Tool-call approvals (HITL)                                                 | [`docs/architecture/chat.md#human-in-the-loop-approval-is-a-requestresponse-pair-executed-by-the-sdk`](../architecture/chat.md#human-in-the-loop-approval-is-a-requestresponse-pair-executed-by-the-sdk) |
| Audience agent factories (customer / cook / admin / booking-request)       | [`docs/features/assistants.md`](./assistants.md)                                                                                                                                                         |
| Assistant sidebar modes, list, empty state, ownership                      | [`docs/features/assistant-sidebar.md`](./assistant-sidebar.md)                                                                                                                                           |
| Offer negotiation chat                                                     | [`docs/features/booking-offer-chat.md`](./booking-offer-chat.md)                                                                                                                                         |
| Customer support chat                                                      | [`docs/features/support-requests.md`](./support-requests.md)                                                                                                                                             |

The admin assistant rail is available from every admin page via the chrome assistant toggle. Layout, compose/list modes, and empty-state
copy: [`assistant-sidebar.md`](./assistant-sidebar.md). Assistant vs human transcript scroll modes and composer micro-states:
[`styles/chat.md`](../styles/chat.md). Audience agents and wiring status: [`assistants.md`](./assistants.md).
