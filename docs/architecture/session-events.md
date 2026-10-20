# Session events (first-party analytics)

## Context

Operators need product insights (pageviews, booking-form drop-off, conversion, auth funnels) without relying only on consent-gated
third-party tools (GA / Clarity). The predecessor people-eat project stored typed `SessionEvents` on the browser session. peopleeat already
has sticky first-touch sessions; it lacked an event stream.

## Decision

**First-party `SessionEvents` table** scoped to `Sessions`, with a typed key ↔ payload map and a single insert helper
(`sessionEventCreate`). Public mutations record visits/interactions for the current session; server commands emit lifecycle and auth events.
Admin GraphQL exposes humanized timelines and a booking-form Sankey.

Cookie consent continues to gate **third-party** analytics only. Session events are product telemetry on the existing session cookie.

Legacy people-eat keys remain in the taxonomy for import and admin humanization. Keys listed in `sessionEventKeysNoLongerProduced` are
**never** accepted by `sessionEventCreate` (password sign-in, newsletter, phone confirm, unconfirmed-email user create, …). New auth uses
`AUTH_*` keys (email OTP, passkey, TOTP).

## Event taxonomy

### Emitted by peopleeat

| Key                                                  | Emitter                                                              | Payload (summary)                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `WEB_PAGE_VISITED`                                   | `SessionWebPageVisitTracker` → `sessionWebPageVisitCreate`           | `webPageKey`, optional `path` / entity ids                                  |
| `WEB_PAGE_INTERACTION`                               | Booking form / cook offer create → `sessionWebPageInteractionCreate` | `webPageKey`, `area`, optional `bookingRequestId`, structured `interaction` |
| `BOOKING_REQUEST_CREATED`                            | `userBookingRequestCreate`                                           | `bookingRequestId`                                                          |
| `BOOKING_REQUEST_CANCELED`                           | `userBookingRequestCancel`                                           | `bookingRequestId`                                                          |
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

Booking-form funnel interactions use stable step ids from `src/shared/bookingRequestFormFunnel.ts` (`step_entered` / `step_completed`), not
UI label strings. Cook offer create-UI steps use `src/shared/cookBookingRequestOfferFunnel.ts` (`area: cook_booking_request_offer`, client
steps `offer_create` / `menus` / `price`) and require `bookingRequestId` on the payload for cook × request aggregation. Gift-card funnel:
`src/shared/giftCardFunnel.ts` (`area: gift_card`, client steps `configure` / `auth` / `checkout`; terminals `created` / `paid` from
lifecycle events). Chef sign-up funnel: `src/shared/chefSignUpFunnel.ts` (`area: chef_sign_up`, client steps `auth` / `profile`; terminal
`created` from `COOK_CREATED`).

### Legacy (imported only; no longer produced)

| Key                                                              | Notes                                                                                                                             |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `SIGN_IN_*`                                                      | Password auth (`FAILED`, `NO_USER_FOR_EMAIL_ADDRESS`, `UNCONFIRMED_EMAIL_ADDRESS`, `NO_PASSWORD`, `WRONG_PASSWORD`, `SUCCESSFUL`) |
| `SESSION_USER_PASSWORD_RESET_*`                                  | Request + confirmation succeeded/failed                                                                                           |
| `USER_CREATE_USER_WITH_UNCONFIRMED_EMAIL_ADDRESS_ALREADY_EXISTS` | Predecessor registration edge case                                                                                                |
| `USER_EMAIL_ADDRESS_UPDATE_CONFIRMATION_*`                       | Email confirm succeeded/failed                                                                                                    |
| `USER_PHONE_NUMBER_UPDATE_CONFIRMATION_*`                        | Phone confirm succeeded/failed                                                                                                    |
| `NEWSLETTER_SUBSCRIPTION_*`                                      | Created / failed / already exists                                                                                                 |

Admin descriptions mark these with “(Legacy)” / “(legacy)”.

## Alternatives considered

| Option                                      | Why rejected                                       |
| ------------------------------------------- | -------------------------------------------------- |
| Logs table for product analytics            | Wrong semantics; ops/debug vs product journey      |
| Third-party only (GA)                       | Consent-gated; weak admin funnel; no session join  |
| Postgres enum for `type`                    | Every new event needs a migration                  |
| Free-form funnel click labels (predecessor) | Brittle Sankey coupling                            |
| Reuse password `SIGN_IN_*` for OTP/passkey  | Misleading; peopleeat auth is OTP / passkey / TOTP |

## Consequences

- High write volume from pageviews: add a retention/aggregation job when needed.
- Booking-form funnel queries exclude bots and sessions whose user is admin or cook. Cook offer funnel cohorts are notified cooks (excluding
  admins); create-UI mid-steps still come from human cook sessions.
- Admin descriptions are bilingual (`descriptionDe` / `descriptionEn`); raw payload stays off the GraphQL surface unless a deep link is
  needed (`link`).
- Import must keep legacy keys in the domain map so timelines stay typed after cutover.

## Import mapping (go-live)

The freeze-cutover ETL (`scripts/migrateFromPeopleEat/`) imports predecessor rows whose `type` is in the peopleeat taxonomy
(`isSessionEventKey`), with the **same nanoIds** (no UUID remap):

- Reuse the same `type` strings (including legacy keys no longer emitted).
- Unknown types land in `MigrationArchive` (`SessionEvents.unmappable`).
- `sessionEventPayloadFromLegacy` maps predecessor booking-form `(areaName, click key)` pairs (e.g. `Occasion Selection` + `Next`) onto
  `{ area: booking_request_form, interaction: { type: 'step_completed', step } }` so the admin Sankey can use imported traffic. Other
  interactions only rename `areaName` → `area`; unmatched free-form clicks stay as clicks. No `step_entered` is invented.

## How it works

1. Client route tracker maps locale-stripped paths → `WebPageKey` (`webPageKeyFromPath`) and calls `sessionWebPageVisitCreate` (skips
   `/admin/*`, `/profile/*`).
2. Booking form emits funnel interactions; cook pool detail / offer create emit cook offer funnel interactions; create/cancel commands emit
   booking lifecycle events.
3. Auth commands emit `AUTH_*` (and user-create / legal-accept) events.
4. Inserts go through `sessionEventCreate` only (typed to `SessionEventKeyEmitted`).
5. Admin: session/user timelines via `Admin.sessionEvents` / `Admin.sessionEventsCounts`; booking-form funnel via
   `Admin.bookingRequestFormFlow`; cook offer funnel via `Admin.cookBookingRequestOfferFlow`; visit buckets via
   `Admin.sessionEventWebPageVisitCreations`.

## Key files

- Domain: `src/server/domain/sessionEvent.ts`
- Shared funnels: `src/shared/bookingRequestFormFunnel.ts`, `src/shared/cookBookingRequestOfferFunnel.ts`, `src/shared/giftCardFunnel.ts`,
  `src/shared/chefSignUpFunnel.ts`
- Path map: `src/shared/webPageKeyFromPath.ts`
- Helper: `src/server/utils/sessionEventCreate.ts`
- Commands: `sessionWebPageVisitCreate`, `sessionWebPageInteractionCreate`, auth / user-create / legal / booking lifecycle emitters
- Queries: `adminSessionEventFindMany`, `adminSessionEventCounts`, `adminAnalyticsBookingRequestFormFlow`,
  `adminAnalyticsCookBookingRequestOfferFlow`, `adminSessionEventWebPageVisitCreationsFindMany`
- Feature UI: [admin-analytics.md](../features/admin-analytics.md)
