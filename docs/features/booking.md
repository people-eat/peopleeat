# Booking

Index only — marketplace booking journey and where each slice lives. This is **not** a third product doc for the whole domain.

peopleeat’s private-chef marketplace loop: customer request → cook pool / offer → negotiate → dual accept → payment → event → admin-gated
cook payout. **Go-live path is live** (form, pool, offers, chat, payment, calls, admin ops).

| Concern                                                              | Doc                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Create request (form, publication, customer list/detail/edit/cancel) | [booking-request-create.md](./booking-request-create.md)           |
| Offers (cook pool, offer create, dual accept, negotiation surfaces)  | [booking-offers.md](./booking-offers.md)                           |
| AI menu evaluation (pool open ranking + inventory recommendation)    | [ai-menu-evaluation.md](./ai-menu-evaluation.md)                   |
| Offer chat (timeline, concierge presence, phone block, chat emails)  | [booking-offer-chat.md](./booking-offer-chat.md)                   |
| Admin offer-chat review pipeline                                     | [admin-offer-chat-review.md](./admin-offer-chat-review.md)         |
| Payment (checkout, pull charge, confirmation, cook payout)           | [booking-payment.md](./booking-payment.md)                         |
| Discovery calls + slots                                              | [booking-request-offer-calls.md](./booking-request-offer-calls.md) |
| Call recordings / transcripts                                        | [call-recordings.md](./call-recordings.md)                         |
| Admin booking ops                                                    | [admin-booking-requests.md](./admin-booking-requests.md)           |
| Structural decisions (schema, GraphQL, fees)                         | [architecture/booking.md](../architecture/booking.md)              |

## Journey (overview)

1. **Customer** creates a booking request (occasion, party, venue, datetime, preferences, message; optional redeem code). Anonymous users
   complete email OTP + profile before submit.
2. Ordinary groups are published to cooks in travel radius; large groups (≥12) wait for admin review before cooks are notified.
3. **Cook** opens the request from the pool, may decline, or creates an **offer** (price; optional menus).
4. Customer and cook negotiate on the offer (chat, menus, price, call slots). At most one dual-accepted offer per request.
5. Dual acceptance → checkout (or €0 path) → event → admin-gated cook bank payout.
6. Either party can schedule / join discovery calls on the offer; admin has a calls hub.
