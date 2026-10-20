# Booking offer chat

Customer, cook, and admin negotiate on an offer through a shared timeline chat with concierge presence and phone-number blocking.

## Behavior

1. On the offer page, the **chat** tab shows the negotiation timeline (messages plus system events such as offer created, price changed,
   accept / decline). Price milestones (`COOK_CREATED`, `COOK_CHANGED_PRICE`, `SYSTEM_CHANGED_PRICE`) show the **customer-facing total**
   (`totalWithoutDiscountsCentsCustomer`: menu + fees + travel), not the cook menu price alone. Opening chat (or schedule) clears that
   role’s unread badge.
2. A **concierge presence** row shows the peer(s) together with Concierge Juliana — copy explains she is in the chat for special requests.
   Customer and cook each see the other party plus Juliana; admins see **customer, cook, and Juliana**. Layout: scrolls away with the
   transcript on small screens; stays pinned above the transcript from medium breakpoints up (same pattern as support chat). Transcript
   scroll uses **human** mode (open/stick at bottom — [styles/chat.md — Human transcript mode](../styles/chat.md#human-transcript-mode)).
3. **Phone numbers are blocked** in outgoing messages (client warning + server reject) to discourage off-platform fee avoidance. Applies to
   customer, cook, and admin sends, and to the optional cook message on offer create.
4. When the customer or cook sends a peer message, the other party gets a **debounced email** (~1 minute) if they still have unread chat
   when the email fires. Opening the chat cancels a pending email. Admin messages do not trigger this email.
5. Chat stays open after dual accept (payment / logistics can continue); it closes when the offer is declined or the request is canceled.
6. **Admins can moderate** any free-text (`*_MESSAGE_SIMPLE`) bubble via an ellipsis menu on the bubble:
   - **Edit** opens a dialog and saves the body only (attachments unchanged). Same phone-number block as send. No “edited” badge and no
     unread / email side effects.
   - **Hide from participants** soft-hides the bubble (`hiddenByAdmin` on the event payload). Admins still see a muted bubble with a clear
     label and can **show to participants** again. Cooks and customers never receive hidden rows in `messages` (server filter). Hide /
     unhide require a confirmation dialog that explains the consequence.
   - **Delete permanently** is available only for **admin** messages (`ADMIN_MESSAGE_SIMPLE`). Irreversible (event + attachments / reactions
     cascade). Confirmation required. Peer messages use hide, not hard delete. Moderation stays available after chat send is closed (ops /
     moderation). Offer handover copies simple messages **still marked hidden** when the source was hidden.
7. **Emoji reactions** on `*_MESSAGE_SIMPLE` bubbles (customer / cook / admin), gated by feature toggle
   `BOOKING_REQUEST_OFFER_CHAT_REACTIONS` (missing = off). Smile control on peer bubbles; toggle same emoji clears. One reaction per party.
   No unread bump and no chat-notify email. Customer/cook reactions require chat still writable; admin may react after send is closed.
   Hidden messages cannot receive reactions. Milestone pills cannot receive reactions. Offer handover does **not** copy reactions onto the
   new offer.

Admin uses the same chat component with admin-oriented presence copy — [admin-booking-requests.md](./admin-booking-requests.md). Peer
messages also enter the post-hoc admin review pipeline — [admin-offer-chat-review.md](./admin-offer-chat-review.md).

## Decisions

### Alternatives considered

| Approach                                               | Notes                                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| Dedicated offer timeline (domain events + messages)    | **Chosen** — negotiation is booking-domain state, not LLM assistant history |
| Store offer chat in the shared Chat / assistant tables | Rejected — would pollute assistant replay                                   |
| Passive concierge presence only                        | **Chosen** — sets expectation without a tagging product                     |
| No phone-number policy                                 | Rejected — fee avoidance via phone exchange is a real marketplace risk      |
| Immediate email on every message                       | Rejected — debounce coalesces rapid back-and-forth                          |
| Emoji reactions always on                              | Rejected — ship behind `BOOKING_REQUEST_OFFER_CHAT_REACTIONS`               |

### Chosen

Project the offer event timeline onto the shared chat UI model for rendering, keep persistence in booking offer events, show Juliana as
passive presence, block phone numbers, and debounce peer chat emails. Emoji reactions reuse `ChatMessageUser.reactions` / the shared smile
picker, persist per party on `BookingRequestOfferEventReactions`, and stay silent (no unread / email).

## Next steps

1. **Medium — Concierge tagging → admin action needed** — See [Ideas](#concierge-tagging--admin-action-needed).

## Ideas

### Concierge tagging → admin action needed

Presence today is **passive**. Next product step: customer or cook explicitly summons help with `@concierge` or `@juliana` in an offer-chat
message. That offer should surface on the admin overview (`/admin`) as an **action needed** queue item (same pattern as publication review /
due payouts — [admin-shell.md](./admin-shell.md)), deep-linking into the admin offer chat tab.

Sketch (not decided): detect mention on send; persist a clearable “concierge attention” signal; list on admin overview (cap ~5 + “View
all”); live via admin updates. Non-goals for a first slice: autocomplete mentions, multi-admin assignment, email/push on tag.

## Implementation

### Persistence vs wire model

`BookingRequestOfferEvents` is the negotiation transcript in the DB. GraphQL projects onto `messages: [ChatMessage!]!`:

- `*_MESSAGE_SIMPLE` → `ChatMessageUser`
- Other event types → `ChatMessageBookingRequestOfferEvent`

Sends: role-scoped `bookingRequestOfferChatMessageCreate` (optional `fileUploadIds`). Admin moderation (no chat-writable gate):

- `admin.bookingRequestOfferChatMessageUpdate(bookingRequestOfferEventId, message)` patches `payload.messageBody` on `*_MESSAGE_SIMPLE` only
  (empty body allowed when attachments exist)
- `admin.bookingRequestOfferChatMessageVisibilityUpdate(bookingRequestOfferEventId, hiddenByAdmin)` sets / clears `payload.hiddenByAdmin`
- `admin.bookingRequestOfferChatMessageDelete(bookingRequestOfferEventId)` hard-deletes `ADMIN_MESSAGE_SIMPLE` only (attachments / reactions
  cascade)

Writability for send: `bookingRequestOfferChatWritableAssert` / UI `bookingRequestOfferChatCanSend` (closed: `USER_DECLINED` /
`COOK_DECLINED` / `CANCELED`). Offer create seeds the booking-request message as the first `USER_MESSAGE_SIMPLE` before `COOK_CREATED`, then
an optional cook `message` as `COOK_MESSAGE_SIMPLE` (phone-blocked on create too; does not schedule the debounced chat-notify email —
offer-created email covers first contact). `COOK_CREATED` stores `menuPriceCents` and `totalWithoutDiscountsCentsCustomer`; chat UI renders
the customer total for create and price-change milestones.

`toGqlOfferChatMessages` filters `hiddenByAdmin` rows for `user` / `cook` viewers; admin sees them with `ChatMessageUser.hiddenByAdmin` /
`canHardDelete` stamped. Chat-notify email “latest peer body” skips hidden rows.

Admin offer handover may optionally hard-copy `*_MESSAGE_SIMPLE` rows (+ attachment joins) onto the new offer
([admin-booking-requests.md](./admin-booking-requests.md)). Copied cook messages include `handedOverFrom` + `originalCreatedAt` in the
payload; `hiddenByAdmin` is preserved when set. `toGqlOfferChatMessages` uses handover fields so prior-chef bubbles keep the old cook’s
display name and true send time, and are never `isOwn` for the new cook. Peer chat-notify emails are not scheduled for copied messages.

Shared UI: `BookingRequestOfferChat` — concierge row + `containsPhoneNumber` on client and all three create commands; optional
`onEditMessage` / `onVisibilityChangeMessage` / `onDeleteMessage` (admin pages) → ellipsis menu + confirm dialogs on `ChatMessageUserView`;
optional `onReactMessage` when `BOOKING_REQUEST_OFFER_CHAT_REACTIONS` is active (`useFeatureToggleActive` with `gateInAdminShell` so admin
offer chat follows the same effective keys as profile). On admin peer bubbles the ellipsis and smile controls stack beside the bubble
(ellipsis above, smile below). Mutations: `bookingRequestOfferChatMessageReactionUpsert` on User / Cook / Admin.

### Offer-chat message emails

| Direction       | Purpose                                          | Template                                               |
| --------------- | ------------------------------------------------ | ------------------------------------------------------ |
| Cook → customer | `BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER` | `BookingRequestOfferChatMessageNotifyForCustomerEmail` |
| Customer → cook | `BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK`     | `BookingRequestOfferChatMessageNotifyForCookEmail`     |

Job ids on `BookingRequestOffers.customerChatMessageNotifyJobId` / `cookChatMessageNotifyJobId`. Helpers:
`bookingRequestOfferChatMessageNotifySchedule.ts`, `bookingRequestOfferChatMessageNotifyEmails.ts`. Job:
`booking-request-offer-chat-message-notify`.

### Key files

- UI: `BookingRequestOfferChat` (customer / cook / admin offer pages)
- Architecture: [docs/architecture/booking.md](../architecture/booking.md) (offer chat ≠ Chat foundation)
- Related: [booking-offers.md](./booking-offers.md), [admin-booking-requests.md](./admin-booking-requests.md),
  [admin-offer-chat-review.md](./admin-offer-chat-review.md)
