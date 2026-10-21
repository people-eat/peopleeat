# Admin offer chat review

Post-hoc monitoring of customer–cook offer chats: admins review full threads, acknowledge, and advance to the next pending offer.

## Behavior

1. When a customer or cook sends a peer offer-chat message, the offer enters (or stays in) the admin review queue. Messages still deliver
   instantly to the other party; nothing is held for approval.
2. Admins open **Angebots-Chats** / **Offer chats** under Messaging (`/admin/offer-chat-reviews`). If work is waiting, they land on the
   oldest pending offer’s full transcript; if the queue is clear, a success empty state is shown.
3. On the review page, admins see occasion, event time, and pending-message context, plus the full negotiation chat (including system
   milestones). Customer and cook are reached via linked presence avatars (and via the offer). The transcript scrolls in the pane; the
   pinned footer is two actions only: **Im Angebot antworten** / **Respond in offer** (opens the admin offer chat tab for concierge replies)
   and **Bestätigen** / **Confirm**. Admins can still edit, soft-hide / unhide, react, or (for admin messages) permanently delete on the
   review surface — [booking-offer-chat.md](./booking-offer-chat.md).
4. **Bestätigen** / **Confirm** clears that offer from the queue and opens the next pending offer, or returns to the empty state when none
   remain. New peer messages after acknowledge put the offer back in the queue.
5. `/admin` shows a fifth action queue (KPI + capped list) for pending offer-chat reviews, deep-linking into the review page. The Messaging
   sidebar item shows a badge with the pending offer count. The daily Slack admin action digest includes the same queue.

Admin messages and chat rows copied during offer handover do not create review work.

## Decisions

### Alternatives considered

| Approach                                                          | Notes                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| Hold peer messages until admin approve                            | Rejected — negotiation must stay real-time                     |
| Per-message acknowledge inbox                                     | Rejected — admins need conversation context                    |
| Offer flag only (needs review / clear) without pending count      | Weaker audit of how much arrived since last review             |
| Offer pending count + reviewed-at + explicit acknowledge (chosen) | Matches support/WhatsApp unread patterns; pipeline-friendly    |
| Ack on opening the chat tab                                       | Rejected — monitoring requires an intentional confirm          |
| Unify with planned `@concierge` summon queue                      | Separate product intent (help request vs mandatory monitoring) |

### Chosen

Post-hoc offer-thread review with `adminChatReviewPendingCount` bumped on peer sends, explicit acknowledge mutation that returns the next
queue item, and a dedicated review surface that reuses the shared offer chat UI.

## Ideas

- Concierge `@juliana` / `@concierge` summon remains a separate planned queue — see [booking-offer-chat.md](./booking-offer-chat.md).

## Implementation

### Persistence

On `BookingRequestOffers`:

- `adminChatReviewPendingCount` (`smallint`, default `0`) — bumped in `userBookingRequestOfferChatMessageCreate` /
  `cookBookingRequestOfferChatMessageCreate`; never on admin send or handover copy
- `adminChatReviewedAt` (`timestamptz`, nullable) — set on acknowledge

Migration: `drizzle/0001_skinny_junta.sql` (defaults keep existing rows out of the queue).

### GraphQL

- `AdminBookingRequestOffer.adminChatReviewPendingCount` / `adminChatReviewedAt`
- `AdminBookingRequestOffer.bookingRequest` (lazy) for review context
- `AdminBookingRequestOfferCriterion.hasAdminChatReviewPending`
- `AdminMutation.bookingRequestOfferChatReviewAcknowledge` → `AdminBookingRequestOfferChatReviewAcknowledgeResult` (`acknowledgedOfferId`,
  `nextOfferId`)

Find-many with `hasAdminChatReviewPending: true` orders by `adminChatReviewedAt ASC NULLS FIRST`, then `createdAt ASC`.

### UI / ops

- Routes: `/admin/offer-chat-reviews`, `/admin/offer-chat-reviews/$bookingRequestOfferId`
- Pages: `AdminOfferChatReviewsPage`, `AdminOfferChatReviewPage` (read-focused transcript; footer Confirm + Respond in offer; no composer)
- Overview + Slack: `AdminOverviewPage`, `adminActionItemsSnapshot`, `adminActionItemsSlackMessage`
- Sidebar badge: `AdminSidebarNavBadges.pendingOfferChatReviewsCounts`

### Key files

- Commands: `adminBookingRequestOfferChatReviewAcknowledge.ts`, peer chat message create commands
- Queries: `adminBookingRequestOfferFindMany.ts`, criterion WHERE helper
- Docs: [booking-offer-chat.md](./booking-offer-chat.md), [admin-shell.md](./admin-shell.md)
