# Booking offer amendment (participants and venue)

After dual accept, customers can propose a new headcount and/or event venue; the cook must accept or decline. Accepting runs an automated
Stripe charge or refund (and gift-card restore when unused credit remains). Cooks can lock further changes by marking groceries /
preparations done. Gated by `BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT`.

## Behavior

1. **Before dual accept**, customers still edit the booking request (occasion, date, location, participants, …). Material changes reset cook
   acceptance (`COOK_NEEDS_TO_ACCEPT`). Paid-headcount changes **auto-scale each open offer’s menu** from that offer’s current menu ÷ old
   paid headcount; address changes may **auto-adjust travel expenses**. Both set `priceAutoAdjustReason`. The cook confirms with **Confirm
   changes** (not the amendment Accept flow).
2. **After dual accept**, participant and/or venue changes use this amendment path only. Entry is the booking-request **Edit** / **Change
   booking** control (same edit route, amendment mode: venue + headcount). Date, occasion, and preferences stay read-only. The edit form
   shows the same live **price** and **travel** impact previews as before accept (scoped to the dual-accepted offer). The offer page shows
   status and links back to that edit path.
3. On a dual-accepted offer (payment `EMPTY` / `SETUP` / `PAYED`, event still ahead), the customer can **propose** when the feature toggle
   is on, preparations are not locked, and there is no unpaid `pendingDeltaPayment` from a prior increase.
4. The booking stays dual-accepted. Live participants, venue, and money stay unchanged until the cook decides. The customer may **withdraw**
   a pending proposal (no money move).
5. The cook sees the proposal on every offer tab (banner + pinned footer **Accept change** / **Decline**) with before/after headcount and/or
   venue and payout. Pending proposals stay actionable even if the rollout toggle is turned off mid-flight.
6. On accept, the platform applies participants and/or venue, scales the locked menu total by paid-headcount when headcount changed,
   recomputes travel when venue changed, re-applies promo + gift against the new pre-discount total (restoring unused gift balance), and:
   - `SETUP` / unpaid pull path: updates offer cents only (pull job charges the new total later)
   - `EMPTY`: cancels open PaymentIntent and SetupIntent when present and re-prepares payment (persists `plannedPayoutDateTime`)
   - `PAYED`: partial customer refund (newest amendment PI first, then primary PI) or off-session delta charge (top-up transfer only after
     PI success); if no reusable payment method, creates an on-session delta PaymentIntent (`pendingDeltaPayment` with customer + cook
     deltas) so the customer can pay in checkout (finalize / Stripe webhook clear the pending delta and top up the cook); Connect reverse
     chunks across top-ups + amendment PI destination transfers + primary transfer
7. On decline or customer cancel, the pending proposal is cleared (cancel is blocked once accept has claimed the amendment); the booking is
   unchanged.
8. The cook can mark **shopping / preparations done** (confirmation dialog first). After that, the customer cannot open a new amendment.
   Admins can clear the lock for ops.
9. Blocked when the event is past, the request is canceled, or payment is `TRANSFERRED` / `PAYED_OUT_OF_SYSTEM` / `FAILED`.
10. Admins may propose or immediately apply venue / participants / absolute menu or travel on dual-accepted offers via
    `bookingRequestOfferAmendmentCreate` / `Apply` (no feature toggle; confirm dialog chooses propose vs apply without cook approval). Prep
    lock and payment-status gates still apply. Pending proposals surface as a warning alert on admin offer chrome, request offers, request
    edit, and price edit. Direct `adminBookingRequestUpdate` venue/participants and `adminBookingRequestOfferUpdate` menu/travel on
    dual-accepted offers stay rejected.

## Decisions

### Alternatives considered

| Approach                                  | Notes                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| Auto-accept decreases with instant refund | Rejected — cooks may require a minimum headcount                       |
| Free customer edit after accept           | Rejected — resets acceptance / money without cook consent              |
| Reuse `COOK_NEEDS_TO_ACCEPT` after pay    | Rejected — would clear dual accept and break paid / pull payment state |
| Change per-person price on amendment      | Rejected for v1 — scale locked menu total only                         |
| Keep gift discount fixed on decrease      | Rejected — unused gift-card credit is restored to the card balance     |
| Customer cancel of a pending amendment    | **Chosen** — customer may withdraw before cook decides                 |

### Chosen

Cook-gated amendment with preparations lock, feature-toggle rollout, Stripe + gift deltas only on cook accept. Keep the booking-request edit
route as the customer entry after accept (venue + participants). Keep pre-accept **Confirm changes** (+ optional menu/travel auto-adjust)
separate from post-accept **Accept change**. Admin can clear the prep lock. Accept claims the pending JSON (`claimedAt`) before Stripe money
moves; Stripe ops use `amendmentApplyId` idempotency keys; Connect top-ups append to `extraTransferIds` (legacy `extraTransferId` kept as
latest).

## Next steps

1. Rename feature toggle to `BOOKING_REQUEST_OFFER_AMENDMENT` once rollout is complete.
2. Richer chat milestones for venue-only proposals.

## Implementation

- Toggle: `BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT` in `src/shared/featureToggle.ts` + GraphQL enum + admin labels
- Schema: `BookingRequestOffers.preparationsCompletedAt`, `participantAmendment` JSONB, `giftCardAppliedCents`. Venue proposals persist
  `travelExpensesCentsAfter` (recomputed cook rate × distance) alongside `exactEventAddress` so pending GraphQL host-price labels match the
  live `travelImpact` preview. Legacy pending JSON (created before travel snapshots) may omit `travelExpensesCentsBefore` /
  `travelExpensesCentsAfter`; GraphQL falls back to the live offer travel when after is missing.
- Domain events: `USER_PARTICIPANT_AMENDMENT_REQUESTED`, `USER_PARTICIPANT_AMENDMENT_CANCELED`, `COOK_PARTICIPANT_AMENDMENT_*`,
  `ADMIN_PARTICIPANT_AMENDMENT_REQUESTED`, `ADMIN_PARTICIPANT_AMENDMENT_APPLIED`, `COOK_PREPARATIONS_COMPLETED`,
  `ADMIN_PREPARATIONS_CLEARED`
- Price helper: `bookingRequestOfferParticipantAmendmentPrice.ts` (menu scale, travel, promo + gift re-apply); customer / admin edit
  `priceImpact` uses the same helper for dual-accepted offers so the live customer-total preview matches the proposal
- Gates: `bookingRequestOfferParticipantAmendmentGates.ts`
- Apply + Stripe: `bookingRequestOfferParticipantAmendmentApply.ts`; claim-before-money; `setupIntentCancel` / status-tolerant
  `paymentIntentCancel`; refundable-cents + reversible-transfer chunking; idempotency keys; `pendingDeltaPayment` (+
  `cookPayoutDeltaCents`); `extraTransferIds`; `giftCardCredit` / fail-closed `giftCardCharge`; webhook finalize via
  `bookingRequestOfferPaymentIntentSucceededApply`
- Commands: `userBookingRequestOfferParticipantAmendmentCreate` / `Cancel`, `cookBookingRequestOfferParticipantAmendmentAccept` / `Decline`,
  `cookBookingRequestOfferPreparationsComplete`, `adminBookingRequestOfferPreparationsClear`, `adminBookingRequestOfferAmendmentCreate` /
  `Apply` (shared prepare helper + absolute menu/travel overrides)
- Emails: cook request; customer accept (status-aware: EMPTY checkout / SETUP pull / PAYED refund-charge / gift restore / pending delta)
- UI: customer propose via `ProfileCustomerBookingRequestEditPage` (amendment mode) + status on booking-request / offer pages; cook
  Accept/Decline in offer page chrome + footer; prep controls on cook Offer tab; admin prep clear on admin offer page

See [booking-payment.md](./booking-payment.md), [stripe-payment.md](../architecture/stripe-payment.md),
[admin-feature-toggles.md](./admin-feature-toggles.md).
