# Booking offer participant amendment

After dual accept, customers can propose a new headcount; the cook must accept or decline. Accepting runs an automated Stripe charge or
refund. Cooks can lock further changes by marking groceries / preparations done. Gated by `BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT`.

## Behavior

1. **Before dual accept**, customers still edit the booking request (occasion, date, location, participants, …). Material changes reset cook
   acceptance (`COOK_NEEDS_TO_ACCEPT`). Paid-headcount changes **auto-scale each open offer’s menu** from that offer’s current menu ÷ old
   paid headcount; address changes may **auto-adjust travel expenses**. Both set `priceAutoAdjustReason`. The cook confirms with **Confirm
   changes** (not the amendment Accept flow).
2. **After dual accept**, participant count changes use this amendment path only. Entry is the booking-request **Edit** / **Change
   participants** control (same edit route, participants-only mode). The offer page shows status and links back to that edit path.
3. On a dual-accepted offer (payment `EMPTY` / `SETUP` / `PAYED`, event still ahead), the customer can **propose** a new adult/child count
   when the feature toggle is on and preparations are not locked.
4. The booking stays dual-accepted. Live participants and money stay unchanged until the cook decides.
5. The cook sees the proposal on every offer tab (banner + pinned footer **Accept change** / **Decline**) with before/after headcount and
   payout. Pending proposals stay actionable even if the rollout toggle is turned off mid-flight.
6. On accept, the platform replaces participants, scales the locked menu total by paid-headcount, recomputes fees, and:
   - `SETUP` / unpaid pull path: updates offer cents only (pull job charges the new total later)
   - `EMPTY`: cancels an open PaymentIntent when present and re-prepares payment
   - `PAYED`: partial customer refund or off-session delta charge, plus Connect transfer reverse / top-up for the cook payout delta
7. On decline, the pending proposal is cleared; the booking is unchanged.
8. The cook can mark **shopping / preparations done** (confirmation dialog first). After that, the customer cannot open a new amendment.
   Admins can clear the lock for ops.
9. Blocked when the event is past, the request is canceled, or payment is `TRANSFERRED` / `PAYED_OUT_OF_SYSTEM` / `FAILED`.

## Decisions

### Alternatives considered

| Approach                                  | Notes                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Auto-accept decreases with instant refund | Rejected — cooks may require a minimum headcount                                        |
| Free customer edit after accept           | Rejected — resets acceptance / money without cook consent                               |
| Reuse `COOK_NEEDS_TO_ACCEPT` after pay    | Rejected — would clear dual accept and break paid / pull payment state                  |
| Change per-person price on amendment      | Rejected for v1 — scale locked menu total only                                          |
| Restore gift-card balance on decrease     | Rejected for v1 — discount cents stay fixed; only card `totalCentsCustomer` deltas move |
| Customer cancel of a pending amendment    | Deferred — cook decline is enough for v1                                                |

### Chosen

Cook-gated amendment with preparations lock, feature-toggle rollout, and Stripe delta only on cook accept. Keep the booking-request edit
route as the customer entry after accept (participants-only). Keep pre-accept **Confirm changes** (+ optional menu/travel auto-adjust)
separate from post-accept **Accept change**. Admin can clear the prep lock.

## Next steps

1. Customer cancel of a pending amendment.
2. Richer payment-method recovery when a near-event `PAYED` offer has no reusable PM for increases.

## Implementation

- Toggle: `BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT` in `src/shared/featureToggle.ts` + GraphQL enum + admin labels
- Schema: `BookingRequestOffers.preparationsCompletedAt`, `participantAmendment` JSONB
- Domain events: `USER_PARTICIPANT_AMENDMENT_REQUESTED`, `COOK_PARTICIPANT_AMENDMENT_*`, `COOK_PREPARATIONS_COMPLETED`,
  `ADMIN_PREPARATIONS_CLEARED`
- Price helper: `bookingRequestOfferParticipantAmendmentPrice.ts`
- Gates: `bookingRequestOfferParticipantAmendmentGates.ts`
- Apply + Stripe: `bookingRequestOfferParticipantAmendmentApply.ts`; `transferReverse` optional `amountCents`; `paymentIntentRefund` returns
  `refundId`; `paymentIntentPaymentMethodIdFindOne`
- Commands: `userBookingRequestOfferParticipantAmendmentCreate`, `cookBookingRequestOfferParticipantAmendmentAccept` / `Decline`,
  `cookBookingRequestOfferPreparationsComplete`, `adminBookingRequestOfferPreparationsClear`
- Emails: cook request (deep link `?tab=offer`); customer accept/decline (`BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_*` purposes)
- UI: customer propose via `ProfileCustomerBookingRequestEditPage` (amendment mode) + status on booking-request / offer pages; cook
  Accept/Decline in offer page chrome + footer (`BookingRequestOfferParticipantAmendmentCookReview`); prep controls on cook Offer tab; admin
  prep clear on admin offer page

See [booking-payment.md](./booking-payment.md), [stripe-payment.md](../architecture/stripe-payment.md),
[admin-feature-toggles.md](./admin-feature-toggles.md).
