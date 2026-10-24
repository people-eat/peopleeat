# Session events (first-party analytics)

## Context

Operators need product insights (pageviews, booking-form drop-off, conversion, auth funnels) without relying only on consent-gated
third-party tools (GA / Clarity). peopleeat already has sticky first-touch sessions; it needed a first-party event stream joined to those
sessions.

## Decision

**First-party `SessionEvents` table** scoped to `Sessions`, with a typed key ↔ payload map and a single insert helper
(`sessionEventCreate`). Public mutations record visits/interactions for the current session; server commands emit lifecycle and auth events.
Admin GraphQL exposes humanized timelines and a booking-form Sankey.

Cookie consent continues to gate **third-party** analytics only. Session events are product telemetry on the existing session cookie.

Historical keys from imported rows remain in the taxonomy so admin timelines stay typed. Keys listed in `sessionEventKeysNoLongerProduced`
are **never** accepted by `sessionEventCreate` (password sign-in, phone confirm, unconfirmed-email user create, …). Current auth emits
`AUTH_*` keys (email OTP, passkey, TOTP). Newsletter subscription events remain live.

## Event taxonomy

### Emitted by peopleeat

| Key                                                  | Emitter                                                              | Payload (summary)                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `WEB_PAGE_VISITED`                                   | `SessionWebPageVisitTracker` → `sessionWebPageVisitCreate`           | `webPageKey`, optional `path` / entity ids                                  |
| `WEB_PAGE_INTERACTION`                               | Booking form / cook offer create → `sessionWebPageInteractionCreate` | `webPageKey`, `area`, optional `bookingRequestId`, structured `interaction` |
| `BOOKING_REQUEST_CREATED`                            | `userBookingRequestCreate`                                           | `bookingRequestId`                                                          |
| `BOOKING_REQUEST_CANCELED`                           | `userBookingRequestCancel`                                           | `bookingRequestId`                                                          |
| `BOOKING_REQUEST_OFFER_ACCEPTED`                     | `userBookingRequestOfferAccept` / `cookBookingRequestOfferAccept`    | `bookingRequestId`, `bookingRequestOfferId`, `actor`: `customer` \| `cook`  |
| `BOOKING_REQUEST_OFFER_DECLINED`                     | `userBookingRequestOfferDecline` / `cookBookingRequestOfferDecline`  | `bookingRequestId`, `bookingRequestOfferId`, `actor`: `customer` \| `cook`  |
| `BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED`            | payment finalize / immediate €0 accept                               | `bookingRequestId`, `bookingRequestOfferId`                                 |
| `BOOKING_REQUEST_OFFER_PAYMENT_FAILED`               | `bookingRequestOfferPaymentFailedApply`                              | `bookingRequestId`, `bookingRequestOfferId`                                 |
| `GIFT_CARD_CREATED`                                  | `giftCardCreate`                                                     | `giftCardId`                                                                |
| `GIFT_CARD_PAYED`                                    | `giftCardPay`                                                        | `giftCardId`                                                                |
| `COOK_CREATED`                                       | `userCookCreate`                                                     | empty                                                                       |
| `USER_CREATE_SUCCESSFUL`                             | `userCreate`                                                         | empty                                                                       |
| `USER_CREATE_FAILED`                                 | `userCreate`                                                         | empty                                                                       |
| `USER_CREATE_USER_WITH_EMAIL_ADDRESS_ALREADY_EXISTS` | `userCreate`                                                         | empty                                                                       |
| `USER_TERMS_ACCEPTED`                                | `userLegalAccept`                                                    | empty                                                                       |
| `USER_PRIVACY_POLICY_ACCEPTED`                       | `userLegalAccept`                                                    | empty                                                                       |
| `AUTH_EMAIL_OTP_REQUESTED`                           | `authEmailOtpRequest`                                                | empty                                                                       |
| `AUTH_EMAIL_OTP_VERIFY_FAILED`                       | `authEmailOtpVerify`                                                 | empty                                                                       |
| `AUTH_EMAIL_OTP_VERIFY_SUCCEEDED`                    | `authEmailOtpVerify`                                                 | `outcome`: `sign_in` \| `registration_ticket`                               |
| `AUTH_PASSKEY_SIGN_IN_SUCCEEDED`                     | `authPasskeyAuthenticateVerify`                                      | empty                                                                       |
| `AUTH_PASSKEY_SIGN_IN_FAILED`                        | `authPasskeyAuthenticateVerify`                                      | empty                                                                       |
| `AUTH_TOTP_CHALLENGE_PENDING`                        | `sessionPrimaryAuthComplete`                                         | empty                                                                       |
| `AUTH_TOTP_VERIFY_SUCCEEDED`                         | `authTotpVerify`                                                     | `via`: `code` \| `recovery`                                                 |
| `AUTH_TOTP_VERIFY_FAILED`                            | `authTotpVerify`                                                     | empty                                                                       |
| `NEWSLETTER_SUBSCRIPTION_CREATED`                    | `sessionNewsletterSubscriptionCreate`                                | empty                                                                       |
| `NEWSLETTER_SUBSCRIPTION_FAILED`                     | `sessionNewsletterSubscriptionCreate`                                | empty                                                                       |
| `NEWSLETTER_SUBSCRIPTION_ALREADY_EXISTS`             | `sessionNewsletterSubscriptionCreate`                                | empty                                                                       |

Booking-form funnel interactions use stable step ids from `src/shared/bookingRequestFormFunnel.ts` (`step_entered` / `step_completed`), not
UI label strings. Cook offer create-UI steps use `src/shared/cookBookingRequestOfferFunnel.ts` (`area: cook_booking_request_offer`, client
steps `offer_create` / `menus` / `price` / `message`) and require `bookingRequestId` on the payload for cook × request aggregation.
Gift-card funnel: `src/shared/giftCardFunnel.ts` (`area: gift_card`, client steps `configure` / `auth` / `checkout`; terminals `created` /
`paid` from lifecycle events). Chef sign-up funnel: `src/shared/chefSignUpFunnel.ts` (`area: chef_sign_up`, client steps `auth` / `profile`;
terminal `created` from `COOK_CREATED`). Booking checkout funnel: `src/shared/bookingRequestCheckoutFunnel.ts`
(`area: booking_request_checkout`, client step `checkout`; terminal `paid` from `BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED`). Discovery
interactions on chefs pages use `area: chefs` with `change` (`searchText`) and `click` (`book_cta`).

### Historical (imported only; no longer produced)

| Key                                                              | Notes                                                                                                                             |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `SIGN_IN_*`                                                      | Password auth (`FAILED`, `NO_USER_FOR_EMAIL_ADDRESS`, `UNCONFIRMED_EMAIL_ADDRESS`, `NO_PASSWORD`, `WRONG_PASSWORD`, `SUCCESSFUL`) |
| `SESSION_USER_PASSWORD_RESET_*`                                  | Request + confirmation succeeded/failed                                                                                           |
| `USER_CREATE_USER_WITH_UNCONFIRMED_EMAIL_ADDRESS_ALREADY_EXISTS` | Registration when an unconfirmed email already existed                                                                            |
| `USER_EMAIL_ADDRESS_UPDATE_CONFIRMATION_*`                       | Email confirm succeeded/failed                                                                                                    |
| `USER_PHONE_NUMBER_UPDATE_CONFIRMATION_*`                        | Phone confirm succeeded/failed                                                                                                    |

Admin descriptions mark these with “(Legacy)” / “(legacy)”.

## Alternatives considered

| Option                                     | Why rejected                                      |
| ------------------------------------------ | ------------------------------------------------- |
| Logs table for product analytics           | Wrong semantics; ops/debug vs product journey     |
| Third-party only (GA)                      | Consent-gated; weak admin funnel; no session join |
| Postgres enum for `type`                   | Every new event needs a migration                 |
| Free-form funnel click labels in payloads  | Brittle Sankey coupling; prefer stable step ids   |
| Reuse password `SIGN_IN_*` for OTP/passkey | Misleading; current auth is OTP / passkey / TOTP  |

## Consequences

- High write volume from pageviews: add a retention/aggregation job when needed.
- Admin visit time-buckets (`Admin.sessionEventWebPageVisitCreations`) use a partial index
  `SessionEvents_webPageVisit_webPageKey_createdAt_idx` on `(payload->>'webPageKey', createdAt)` where `type = 'WEB_PAGE_VISITED'`.
- Cook analytics profile-view counts use a second partial index `SessionEvents_webPageVisit_chefs_cookId_createdAt_idx` on
  `(payload->'params'->>'cookId', createdAt)` where `type = 'WEB_PAGE_VISITED'` and `webPageKey = 'CHEFS'` (human sessions only in the
  query). See [cook-analytics.md](../features/cook-analytics.md).
- Booking-form funnel queries exclude bots and sessions whose user is admin or cook. Cook offer funnel cohorts are notified cooks (excluding
  admins); create-UI mid-steps still come from human cook sessions.
- Admin descriptions are bilingual (`descriptionDe` / `descriptionEn`); raw payload stays off the GraphQL surface unless a deep link is
  needed (`link`).
- Historical keys stay in the domain map so imported timelines remain typed.
- Webhook payment paths attach lifecycle events to the customer’s latest non-terminated session when no requesting session exists.

## How it works

1. Client route tracker maps locale-stripped paths → `WebPageKey` (`webPageKeyFromPath`) and calls `sessionWebPageVisitCreate` (skips
   `/admin/*`, `/profile/*`). `/log-on` and legacy `/sign-in` both map to `SIGN_IN`.
2. Booking form emits funnel interactions; cook pool detail / offer create emit cook offer funnel interactions; create/cancel and
   marketplace accept/decline/payment commands emit booking lifecycle events. Booking checkout UI emits checkout funnel interactions.
3. Auth commands emit `AUTH_*` (and user-create / legal-accept) events.
4. Inserts go through `sessionEventCreate` only (typed to `SessionEventKeyEmitted`).
5. Admin: session/user timelines via `Admin.sessionEvents` / `Admin.sessionEventsCounts`; booking-form / gift-card / chef sign-up /
   booking-checkout funnels via the matching `Admin.*Flow` fields; cook offer funnel via `Admin.cookBookingRequestOfferFlow`; visit buckets
   via `Admin.sessionEventWebPageVisitCreations`.

## Key files

- Domain: `src/server/domain/sessionEvent.ts`
- Shared funnels: `src/shared/bookingRequestFormFunnel.ts`, `src/shared/cookBookingRequestOfferFunnel.ts`, `src/shared/giftCardFunnel.ts`,
  `src/shared/chefSignUpFunnel.ts`, `src/shared/bookingRequestCheckoutFunnel.ts`
- Path map: `src/shared/webPageKeyFromPath.ts`
- Helper: `src/server/utils/sessionEventCreate.ts`, `src/server/utils/sessionIdForUserLatestFind.ts`
- Commands: `sessionWebPageVisitCreate`, `sessionWebPageInteractionCreate`, auth / user-create / legal / booking lifecycle emitters
- Queries: `adminSessionEventFindMany`, `adminSessionEventCounts`, `adminAnalyticsBookingRequestFormFlow`, `adminAnalyticsGiftCardFlow`,
  `adminAnalyticsChefSignUpFlow`, `adminAnalyticsBookingRequestCheckoutFlow`, `adminAnalyticsCookBookingRequestOfferFlow`,
  `adminSessionEventWebPageVisitCreationsFindMany`, `cookAnalyticsFind`
- Feature UI: [admin-analytics.md](../features/admin-analytics.md), [cook-analytics.md](../features/cook-analytics.md)
