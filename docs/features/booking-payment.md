# Booking payment

After dual acceptance, the customer pays (or completes a €0 path); later an admin releases the cook payout.

## Behavior

1. When customer and cook both accept an offer, the customer is guided to a **dedicated checkout** page for that offer (invoice address +
   card / setup flow). Gift cards and promo codes fold into the customer total when applied.
2. **€0** totals (fully covered by credit) skip card collection and still confirm the booking.
3. After successful payment (or €0 accept), the customer receives a confirmation email. Accept also emails the chosen cook and notifies
   sibling cooks who were not chosen. The chosen cook can read the checkout **invoice address** on the offer Request tab (for their own
   invoicing).
4. For pull/charge-later paths, the customer receives an announcement email before the card is charged. If the customer only completes
   SetupIntent checkout **after** `plannedPaymentPullDateTime`, checkout / offer copy warns that the card is charged right after saving
   details (the pull job is enqueued with a past `startAfter` and runs ASAP). Admin Costs shows the same overdue note next to the planned
   pull timestamp.
5. After the event, **cook bank payout** is admin-gated: due payouts surface on the admin overview; an admin releases a Connect payout,
   checks whether a Stripe payout already took place, or marks out-of-system. Cooks do not self-trigger payout. On completed offers, the
   cook Offer tab shows an info banner with the invoice amount (menu + travel before the platform fee) and notes that the fee was deducted
   at payout.

Stripe Connect setup for cooks: [cook-profile.md](./cook-profile.md). Fee structure (default 18% cook / 4% customer; admins may override
percents per offer, sticky on that offer): [architecture/stripe-payment.md](../architecture/stripe-payment.md) and
[architecture/booking.md](../architecture/booking.md). Admin payout UI: [admin-booking-requests.md](./admin-booking-requests.md).

## Decisions

### Alternatives considered

| Approach                                           | Notes                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| Dedicated checkout route per offer                 | **Chosen** — full-page Stripe Elements; clear invoice + pay moment             |
| Inline pay dialog on the offer page                | Rejected — too cramped for invoice + Payment Element                           |
| Auto cook payout when due                          | Deferred — admin gate preferred until Connect readiness + ops trust are proven |
| Skip payment columns until charge ships            | Rejected — fee/payment shape is core to the marketplace                        |
| Platform as merchant of record + Connect transfers | **Chosen** — see stripe-payment ADR                                            |

### Chosen

Checkout after dual accept (SetupIntent / PaymentIntent / €0), shared finalize with Stripe webhooks (PI success/processing/fail/cancel and
SI success/fail/cancel), pull-payment announcement emails, and admin-gated cook payout after `plannedPayoutDateTime`. Gift cards still
finalize via client `giftCardPay` (not the booking webhook path).

## Next steps

1. **Medium — Automatic cook payout job** — Release when due and Connect is ready (today admin-gated only).
2. ~~**Participant / venue amendment deltas**~~ — Shipped behind `BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT` (gift restore + location);
   see [booking-offer-participant-amendment.md](./booking-offer-participant-amendment.md).

## Implementation

### Flow

- Customer accept prepares SetupIntent / PaymentIntent / €0 transfer; gift-card / promo fold into `totalCentsCustomer`
- Checkout: `/profile/booking-requests/$id/offers/$offerId/checkout` (`StripePaymentPanel`); `bookingRequestOfferPaymentStatusUpdate`;
  `useUserUpdatesSeed`
- Checkout + Stripe webhook (`POST /api/webhooks/stripe` → `stripeWebhookApply`) share finalize helper for PI/SI success; fail/cancel mark
  `paymentStatus: FAILED`. Event catalog + Dashboard setup: [stripe-payment.md](../architecture/stripe-payment.md#webhooks--dashboard-setup)
- Jobs: `booking-request-offer-pull-payment`, `booking-request-offer-pull-payment-announcement` (emails
  `BookingRequestOfferPullPaymentAnnouncementForCustomerEmail`)
- Admin: `bookingRequestOfferPayoutRelease` / `bookingRequestOfferPayoutAlreadyTookPlaceCheck` / `bookingRequestOfferPayoutMarkOutOfSystem`
  (due queue on `/admin`)
- Lifecycle emails: accept (+ not-chosen) / payment confirm / pull announcement — `src/server/utils/bookingRequestLifecycleEmails.ts`

### Key files

- Checkout page: `ProfileCustomerBookingRequestOfferCheckoutPage.tsx`
- Pricing: `src/shared/bookingRequestOfferPrice.ts`, `bookingRequestOfferPriceGuidance.ts`
- Offer columns: `paymentStatus` / `paymentData` / pull & payout timestamps on `BookingRequestOffers`
- Related: [booking-offers.md](./booking-offers.md), [gift-card-purchase.md](./gift-card-purchase.md),
  [admin-promo-codes.md](./admin-promo-codes.md)
