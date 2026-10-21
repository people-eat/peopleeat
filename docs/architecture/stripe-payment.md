# Stripe Connect payments

## Context

peopleeat is a private-chef marketplace: customers pay the platform; cooks receive a share via Stripe Connect. The product needs Stripe
Customers, SetupIntents (save card), PaymentIntents (charge), Express connected accounts (cook onboarding), destination charges with an
optional top-up transfer when the cook payout exceeds the customer pull, transfer reversal, and webhook verification.

That surface lives as a **ServerRuntime capability** so booking and cook commands can call `serverRuntime.stripe.*` the same way they call
`email` / `browser`, and tests can stub Stripe without hitting the network.

## Decision

Expose a domain-facing `StripePayment` interface on `ServerRuntime.stripe`, implemented by `stripePaymentCreate()` in `src/server/stripe/`.

### Abstraction level

- **Keep** marketplace-shaped methods (split PaymentIntents, Express onboarding URLs, transfers) — not a thin raw Stripe SDK dump.
- **Hide** Stripe SDK types from commands. Results use our ids / client secrets / discriminated unions (`onboardingRequired` |
  `onboardingComplete`).
- **Do not** put customer/account id persistence in this capability. Search Stripe Customer metadata by `userId` for convenience; for
  Connect accounts, require `existingAccountId` when the cook row already has one. Commands own writing `stripeAccountId`,
  `stripeAccountActive`, and `stripeAccountActiveWasReset` on `Cooks` (flat columns — not a JSON payout-methods array). See
  [docs/features/cook-profile.md](../features/cook-profile.md).
- **Do not** list all Connect accounts to find by email on the happy path (unbounded and fragile). Customers get `customers.search`; Connect
  has no equivalent search API. Reuse is `existingAccountId` from the cook row. Bounded metadata scan (`metadata.cookId`) is recovery-only
  when an idempotency key collides with a different prior body.
- Amounts are integer minor units (cents for EUR). Currency is fixed to `eur` in the factory until multi-currency is a product need.
- Address `country` values are ISO 3166-1 alpha-2; callers map localized names.
- **Express account create is stable; KYC prefill is a follow-up update.** `accountCreate` creates the Express account with a fixed body
  (type, email, business profile, payout schedule, capabilities, `metadata.cookId`) under idempotency key `cook-express-account:{cookId}`,
  then best-effort `accounts.update`s optional `phoneNumber` / `dateOfBirth` / name / `address` from `cookStripeOnboardingStart` before the
  first Account Link. Mutable prefill must not sit on the create call — otherwise a second click after the cook edits phone/address hits
  Stripe’s “same idempotency key, different parameters” error while `Cooks.stripeAccountId` is still null. Phone prefill: if Stripe rejects
  `individual.phone`, retry the update without phone (no second create key). On idempotency parameter mismatch (legacy create bodies that
  included KYC fields), recover by bounded `accounts.list` scan for `metadata.cookId`, else create under
  `cook-express-account:{cookId}:stable`. Existing Connect accounts are not retroactively updated outside this first-create path.

### Charge pattern

Destination charges (`transfer_data.destination` + optional `transfer_data.amount`) on Express connected accounts. Platform remains the
merchant of record.

When `payoutAmount > pullAmount`, the PaymentIntent only moves `pullAmount` to the cook. The factory returns `pendingExtraTransferAmount` +
`transferGroup`. Commands must call `transferCreate` **after** the PaymentIntent has succeeded (typically from a webhook or a confirmed
success check). Creating the top-up transfer before confirmation would debit platform balance against an unconfirmed charge.

### Manual bank payouts (post-event)

Express connected accounts are created with `payouts.schedule.interval: 'manual'`. Destination charges (and optional top-up transfers)
credit the cook Connect **balance** at customer payment time (`paymentStatus: PAYED`). Moving that balance to the cook’s bank is a separate
**admin-gated** Stripe Payout via `payoutCreate({ destinationAccountId, amount })` after `plannedPayoutDateTime` — see
[admin-booking-requests.md](../features/admin-booking-requests.md) (`bookingRequestOfferPayoutRelease`). Ops can also run
`bookingRequestOfferPayoutAlreadyTookPlaceCheck`: it lists recent Connect payouts via `accountPayoutsFindMany` and sets `TRANSFERRED` only
when a matching amount is found (no `payoutCreate`). The same check can upgrade `PAYED_OUT_OF_SYSTEM` when ops marked out-of-system by
accident. `accountPayoutsEnabledCheck` surfaces readiness before the release CTA. Callers that hydrate admin offer lists wrap that check so
a Stripe retrieve failure (stale or fixture `acct_…` id) marks the cook not payout-ready rather than crashing the page.

### Concierge offer handover money

`AdminMutation.bookingRequestOfferHandover` closes a dual-accepted offer and opens another for a different cook (event still in the future):

| Old `paymentStatus`          | Behavior                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EMPTY` / `SETUP` / `FAILED` | Cancel unpaid PI when present; cancel pull jobs; prepare payment for the new cook                                                                             |
| `PAYED`                      | `transferReverse` on stored `transferId` / `extraTransferId` (or destination transfer lookup), then `transferCreate` to the new cook; new offer stays `PAYED` |
| `PAYED_OUT_OF_SYSTEM`        | DB-only after admin confirm                                                                                                                                   |
| `TRANSFERRED`                | Blocked (bank payout already left Connect)                                                                                                                    |

Top-up Connect transfers persist as `paymentData.extraTransferId`. `paymentIntentRefund` returns `{ refundId }` and is used by post-accept
participant amendments (partial refunds). `transferReverse` accepts optional `amountCents` for partial Connect reversals on decreases;
handover of equal-price `PAYED` offers still prefers full reverse + retransfer so the customer is not re-charged. See
[booking-offer-participant-amendment.md](../features/booking-offer-participant-amendment.md).

### Env

Required at boot via `environmentVariablesCreate`:

| Env var                  | Typed field            |
| ------------------------ | ---------------------- |
| `STRIPE_SECRET_KEY`      | `stripeSecretKey`      |
| `STRIPE_WEBHOOK_SECRET`  | `stripeWebhookSecret`  |
| `STRIPE_PUBLISHABLE_KEY` | `stripePublishableKey` |

Publishable key is served to the browser via GraphQL (not only on `ServerRuntime`).

Admin offer detail also exposes Stripe Dashboard deep links (`AdminBookingRequestOffer.stripePaymentIntentUrl` / `stripeSetupIntentUrl`)
built from stored `paymentData` ids via `stripeDashboardUrls` helpers; test vs live path follows `stripeSecretKey.startsWith('sk_test')`.
`AdminCook.stripeAccountUrl` uses the same helpers for Connect account deep links on the admin user cook-profile tab.

### Connect wallet requirements (live)

`accountRequirementsFindOne(accountId)` retrieves the Express account and returns a domain DTO: capability flags (`detailsSubmitted` /
`chargesEnabled` / `payoutsEnabled`), a mapped `disabledReason`, and deduped requirement **categories** for `currently_due` / `past_due` /
`pending_verification` (never raw Stripe keys). Used by `Cook.stripeAccountDetails` on `/profile/wallet` — see
[cook-profile.md](../features/cook-profile.md). Do not put this field on `userUpdates` (would call Stripe on every push).

### Connect wallet balance (live)

`accountBalanceFindOne(accountId)` retrieves the connected-account Balance (`Stripe-Account` header) and sums the `eur` buckets for
`available` / `pending` into integer cents. `accountBalanceTransactionsFindMany({ accountId, limit })` lists recent Balance Transactions on
that account (newest first) and maps Stripe `type` / `status` to cook-facing enums (`PAYMENT` / `PAYOUT` / …, `AVAILABLE` / `PENDING`). Used
by `Cook.stripeWallet` on `/profile/wallet` when `COOK_WALLET_STRIPE_BALANCE` is enabled for the cook — same ownership + failure-null
pattern as requirements; never on `userUpdates`. `accountPayoutsFindMany({ accountId, limit })` lists recent Connect **Payouts** (newest
first) for admin reconcile of Dashboard-created bank payouts.

### Webhooks — Dashboard setup

HTTP route: `POST /api/webhooks/stripe` (`src/routes/api/webhooks/stripe.ts`).

1. In the Stripe Dashboard, create a webhook endpoint pointing at `https://<host>/api/webhooks/stripe`.
2. Listen to **both**:
   - **Events on your account** — PaymentIntent + SetupIntent (platform is merchant of record; destination-charge PIs fire here).
   - **Events on Connected accounts** — `account.updated` for Express cooks.
3. Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET` (see [infrastructure.md](../infrastructure.md)).
4. Local tip: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and use the CLI signing secret for `.env.local`.

`webhookEventConstruct` verifies the Stripe-Signature header against the raw body and returns `{ id, type, dataObject }`. Dispatch lives in
`stripeWebhookApply`. Happy-path applies and subscribed ack-only types are silent (HTTP 200, no DB write for ack-only). `log.warn` for
unexpected/unhandled inputs (missing/invalid signature, handled event missing object `id`, event type outside the handle + ack-only
catalog); `log.error` when the handler throws. Gift-card checkout still finalizes via client `giftCardPay`.

#### Events we subscribe to

**Handle (side effects):**

| Event                           | Behavior                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payment_intent.succeeded`      | Finalize matching offer → `PAYED` (`bookingRequestOfferPaymentIntentSucceededApply`)                                                                       |
| `payment_intent.processing`     | Same (async methods such as SEPA)                                                                                                                          |
| `payment_intent.payment_failed` | Mark matching offer `FAILED` if not already paid/transferred; Slack fail notify                                                                            |
| `payment_intent.canceled`       | Same as payment_failed                                                                                                                                     |
| `setup_intent.succeeded`        | Finalize matching offer → `SETUP` (`bookingRequestOfferSetupIntentSucceededApply`)                                                                         |
| `setup_intent.setup_failed`     | Mark matching offer `FAILED` if not terminal-paid                                                                                                          |
| `setup_intent.canceled`         | Same as setup_failed                                                                                                                                       |
| `account.updated`               | Lookup cook by `stripeAccountId`; sync `stripeAccountActive` / `stripeAccountActiveWasReset` via `cookStripeAccountStatusApply` (no wallet visit required) |

**Subscribe, ack only** (no DB write — unused product paths: no manual capture, no `customer_balance`):

- `payment_intent.created`
- `payment_intent.amount_capturable_updated`
- `payment_intent.partially_funded`
- `payment_intent.requires_action`
- `setup_intent.created`
- `setup_intent.requires_action`

Do **not** add `capability.updated` / `person.*` / `external_account.*` for now; `account.updated` already carries charges / payouts /
requirements changes for Express.

Cook wallet return URL still calls `cookStripeStatusSync` (same apply helper). Live requirement categories stay on-demand via
`Cook.stripeAccountDetails` on `/profile/wallet`. When Stripe later needs more info, `ACTIVE_WAS_RESET` surfaces on the cook overview
Attention lane — see [cook-profile.md](../features/cook-profile.md).

## Alternatives considered

| Option                                        | Why rejected                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Raw `Stripe` client on `ServerRuntime`        | Leaks SDK into every command; hard to stub/test                                                    |
| Checkout Sessions only                        | Product needs custom Payment Element / off-session / Connect splits                                |
| Accounts v2 for cooks                         | Prefer Express + destination charges for the booking fee split; revisit when onboarding UX changes |
| Inline extra transfer on PaymentIntent create | Unsafe if payment never succeeds; deferred to post-success `transferCreate`                        |

## Consequences

- Booking/cook commands can be added without revisiting Stripe wiring.
- Local/dev boots without Stripe keys still work until a stripe method is called.
- Callers must persist Connect `accountId` after `accountCreate`.
- Split top-ups need a two-step command/webhook flow using `pendingExtraTransferAmount`.
- Connect readiness can update from `account.updated` before the cook opens the wallet; payment/setup failure webhooks keep offer
  `paymentStatus` in sync when the client mutation does not run.

## Key files

- `src/server/stripe/StripePayment.ts` — interface + input/result types
- `src/server/stripe/stripePaymentCreate.ts` — Stripe SDK adapter
- `src/server/stripe/stripeAccountOnboardingComplete.ts` — Express readiness check
- `src/server/stripe/stripeInvalidPhoneError.ts` — detect Stripe `individual.phone` rejection for prefill retry
- `src/server/stripe/stripeIdempotencyMismatchError.ts` — detect idempotency key / parameter mismatch for Connect create recovery
- `src/server/stripe/stripeRequirementCategories.ts` — map Account `requirements.*` keys → cook-facing categories / disabled reasons
- `src/server/stripe/stripeBalanceTransactionKind.ts` — map Balance Transaction `type` / `status` → cook-facing enums
- `src/server/stripe/stripePayoutStatus.ts` — map Payout `status` → cook/ops-facing enums
- `src/server/stripe/stripeSearchQuote.ts` — Search query escaping
- `src/routes/api/webhooks/stripe.ts` — HTTP entry (signature verify + dispatch)
- `src/server/commands/stripeWebhookApply.ts` — event type dispatch
- `src/server/commands/cookStripeAccountStatusApply.ts` — shared Connect flag sync (mutation + webhook)
- `src/server/commands/bookingRequestOfferPaymentIntentSucceededApply.ts` — PI success finalize
- `src/server/commands/bookingRequestOfferSetupIntentSucceededApply.ts` — SI success finalize
- `src/server/commands/bookingRequestOfferPaymentFailedApply.ts` — PI/SI fail or cancel → `FAILED`
- `src/server/domain/ServerRuntime.ts` — `stripe: StripePayment`
- `src/server/domain/serverRuntimeCreate.ts` — wires the factory

## Gift cards / shared Elements panel

- `paymentIntentCancel` cancels abandoned prepared PaymentIntents (gift-card cleanup job).
- Public checkout uses `Session.giftCard.payment.publishableKey` + `clientSecret` with the reusable `StripePaymentPanel` (`SETUP_INTENT` |
  `PAYMENT_INTENT` + invoice address) — booking reuses the same panel on a dedicated checkout route.
- **Confirm is one-shot:** the parent flips `confirm` to `true` to trigger `confirmPayment` / `confirmSetup`. The panel keeps an internal
  latch until the parent resets `confirm` to `false` (failure / retry). Callbacks are Effect Events so parent re-renders after the first
  success do not re-confirm (which would yield Stripe `payment_intent_unexpected_state` and an error toast on top of success). An
  already-succeeded intent is treated as success if Stripe returns that error anyway.
- **Client load scope:** `routeTree.gen.ts` eagerly imports every route module. The default `@stripe/stripe-js` entry injects
  `https://js.stripe.com` as an import side effect (fraud detection). To keep that off unrelated pages (`/chef-sign-up`, etc.):
  1. `StripePaymentPanel` imports `loadStripe` from `@stripe/stripe-js/pure` (no inject until `loadStripe()`).
  2. Callers must **not** statically import the panel — `GiftCardPage` and the booking checkout page use `React.lazy` so
     `@stripe/react-stripe-js` (which still imports the side-effectful default entry) only evaluates when payment UI mounts.
- **Same lazy pattern for other heavy UI:** LiveKit (`BookingRequestOfferCallPanel`) loads only after a call session starts;
  `ImageCropDialog` (`react-easy-crop`) mounts only when a crop is open. See
  [conventions.md](../conventions.md#client-bundle--code-splitting).
- **Webhooks:** `POST /api/webhooks/stripe` handles booking PI/SI success and failure plus Connect `account.updated` (see Webhooks setup
  above). Gift cards still finalize via `giftCardPay` after Elements confirms.
- Booking checkout mounts lazy `StripePaymentPanel` on `/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/checkout`
  when `offer.payment` is present (`USER_NEEDS_DEPOSIT_PAYMENT`). The offer page surfaces a pending-payment attention banner (and offer-tab
  alert) that links to that route; accept navigates there once payment is ready. After Elements confirm,
  `bookingRequestOfferPaymentStatusUpdate` persists the invoice address (ISO country) on the booking request and advances `paymentStatus`.
  Shared helper `toStripeCountryCode` maps long country names when copying the event venue into the Address Element.
