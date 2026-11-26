# Admin analytics

Operators inspect first-party product analytics: booking-form, gift-card, booking-checkout, chef sign-up, and cook offer creation funnels,
and sign-in method usage. Page-visit time series live on [admin-traffic.md](./admin-traffic.md).

## Behavior

1. Admins open `/admin/analytics` (sidebar **Analysen** / **Analytics**).
2. A date range (same overview picker pattern as sessions/logs) drives all widgets.
3. **Overview KPIs** — form visits (sum of `WEB_PAGE_VISITED` buckets for `BOOKING_REQUEST_FORM`), sessions with any funnel completion
   (`step_completed` or `BOOKING_REQUEST_CREATED`), booking requests created, and visit→create conversion %.
4. **Booking form funnel**
   - **Step table** — per-step distinct sessions. **Reached** is `step_entered` ∪ `step_completed` so completed never exceeds reached
     (migrated rows and lost enter events still count as reached). **Completed** is `step_completed`. Drop-off % is from the previous
     visible step’s completions (hidden when completed ≥ previous, so the column never goes negative). Terminal `created` comes from
     `BOOKING_REQUEST_CREATED` (no entered count). The **Reached** column is hidden when every client step’s entered count is 0.
   - **Sankey** — one path per session: the unique completed steps in catalog order, consecutive pairs (skips allowed). Each session
     contributes at most 1 to any edge. Shown only when at least one forward link exists.
5. **Gift card funnel** — session-grain steps `configure` → `auth` → `created` → `checkout` → `paid` (human non-admin/non-cook).
   `GIFT_CARD_CREATED` maps to `created`; `GIFT_CARD_PAYED` maps to `paid`. **Paid** KPI / `terminalCount` is sessions that paid, not
   sessions that only created a prepared card.
6. **Booking checkout funnel** — session-grain steps `checkout` → `paid` (human non-admin/non-cook). Client mid-step on the customer offer
   checkout page; terminal from `BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED`. Webhook / pull-payment jobs attach `paid` to the session that
   already has checkout interactions for that request when no GraphQL `sessionId` is present.
7. **Chef sign-up funnel** — session-grain steps `auth` → `profile` → `created` (human non-admin; cooks included). Terminal from
   `COOK_CREATED`.
8. **Cook offer funnel** (cook × booking-request grain)
   - **Cohort** — `BookingRequestCooks` rows with `notifiedAt` in range (admins excluded).
   - **KPIs** — notified, opened, declined (decline without create-UI path), offers created, conversion notified→offer.
   - **Opened** — `firstOpenedAt`, or inferred when the row later declined / started create / has an offer (older imported rows often lack
     `firstOpenedAt`).
   - **Steps** — `notified` → `opened` → either `declined` **or** `offer_create` → `menus` → `price` → `message` → `created`. Early/terminal
     steps from `BookingRequestCooks` / `BookingRequestOffers`; create-UI mid-steps from `WEB_PAGE_INTERACTION` with
     `area: cook_booking_request_offer` and `bookingRequestId`. Historical offers with no UI events skip mid-steps (`notified` → `opened` →
     `created`). Completing a later client step infers earlier client steps as passed through; the offer row itself does not.
   - **Drop-off %** — vs the graph parent (`declined` and `offer_create` both vs `opened`; `created` vs `message`), not vs the previous
     table row.
   - **Sankey** — completed steps only, consecutive pairs on that per-row sequence (decline branches off opened; skip-edges when mid-steps
     are missing).
9. **Sign-in methods** — human non-impersonation sessions in range (cooks included, bots and admin impersonation excluded). Per-method table
   for Email OTP, Passkey, and Google: sign-ins, registration tickets, accounts created, failures. Daily grouped bar chart of sign-ins.
   Google account creates are `AUTH_OAUTH_ACCOUNT_CREATED`; email account creates are `USER_CREATE_SUCCESSFUL` minus those Google creates.
10. **Page visits** — the form-visit KPI still sums `WEB_PAGE_VISITED` for `BOOKING_REQUEST_FORM`. Line charts and filters for every public
    page live on `/admin/traffic` ([admin-traffic.md](./admin-traffic.md)).

### Funnel filters and empty states

- Booking-form / gift-card / booking-checkout funnel aggregation includes only **human** sessions (`isBot = false`) whose `userId` is
  **not** an admin or cook.
- Cook offer funnel uses notified cook affinities (not session grain); create-UI events still require a human non-admin cook session.
- Form-visit KPI buckets do **not** apply that filter, so the visit count can be above funnel completions (e.g. admin self-tests, bots, or
  visits without structured completions). Traffic’s default audience is humans.
- Empty Sankey copy distinguishes: no structured completions yet; completions but no multi-step transitions; or no data at all.
- Booking-form funnel aggregation only counts the structured `{ area: booking_request_form, interaction: { type, step } }` shape (plus
  `BOOKING_REQUEST_CREATED`). Imported historical clicks were reshaped into `step_completed` where mapping was known; unmatched free-form
  clicks still do not appear. Completing a step counts as reaching it, so mixed live + migrated ranges do not show completed > reached. The
  Reached column is omitted only when every client step’s entered count is 0.
- Cook create-UI mid-steps (`offer_create` / `menus` / `price` / `message`) only appear after live instrumentation; historical cohorts still
  show notified / opened / declined / created from DB timestamps (Sankey skip-edge to `created`).

Session and user event timelines live on session detail and the user **session-events** tab (see [admin-sessions.md](./admin-sessions.md)
and [admin-users.md](./admin-users.md)). Offer accept / decline / payment lifecycle events also appear there.

## Decisions

### Alternatives considered

| Option                                    | Notes                                                             |
| ----------------------------------------- | ----------------------------------------------------------------- |
| Nest analytics under `/admin/sessions`    | Rejected — different job (aggregates vs session triage)           |
| Dedicated `/admin/analytics` hub (chosen) | Aggregates and funnels need their own surface, not session triage |
| Metabase only                             | External; no in-product funnel                                    |
| Cook funnel per browser session           | Rejected — notify has no cook session; conversion is per request  |

### Chosen

In-app overview with KPIs, step table, Sankey + visit buckets; event store documented in
[session-events.md](../architecture/session-events.md). Cook offer funnel uses cook × booking-request grain.

## Next steps

1. **Medium — Retention job** — prune or roll up old pageviews.
2. **Low — Staff include toggle** — optionally include admin/cook sessions for local verification.
3. **Low — Cook activation** — menu create / Stripe Connect / availability after chef sign-up.

## Implementation

- SDL: `AdminSessionEvent`, `AdminAnalyticsBookingRequestFormFlow`, `AdminAnalyticsSessionFunnelFlow`,
  `AdminAnalyticsCookBookingRequestOfferFlow`, `AdminAnalyticsFunnelStepStats`, `AdminSignInMethodStats`, `Admin.bookingRequestFormFlow`,
  `Admin.giftCardFlow`, `Admin.bookingRequestCheckoutFlow`, `Admin.chefSignUpFlow`, `Admin.cookBookingRequestOfferFlow`,
  `Admin.signInMethodStats`, `Admin.sessionEventWebPageVisitCreations`, `Admin.sessionEvents`, `Admin.sessionEventsCounts`
- Queries: `adminAnalyticsBookingRequestFormFlow`, `adminAnalyticsGiftCardFlow`, `adminAnalyticsBookingRequestCheckoutFlow`,
  `adminAnalyticsChefSignUpFlow`, `adminAnalyticsCookBookingRequestOfferFlow`, `adminAnalyticsSignInMethodStats`,
  `adminSessionEventWebPageVisitCreationsFindMany`, `adminSessionEventFindMany`
- Mapper: `toGqlAdminSessionEvent`
- Shared steps: `src/shared/bookingRequestFormFunnel.ts`, `src/shared/cookBookingRequestOfferFunnel.ts`, `src/shared/giftCardFunnel.ts`,
  `src/shared/chefSignUpFunnel.ts`, `src/shared/bookingRequestCheckoutFunnel.ts`, `src/shared/chefsDiscovery.ts`
- UI: `AdminAnalyticsPage`, route `analytics.tsx`, nav via `adminCatalog` (`analytics` stub slug with real page)
- Indexes: visit buckets use `SessionEvents_webPageVisit_webPageKey_createdAt_idx` (partial on `WEB_PAGE_VISITED`); overview time-buckets
  also rely on `createdAt` indexes on `Users`, `Logs`, `BookingRequests`, `Chats`, `CookCallSlotBookings`
- Architecture: [session-events.md](../architecture/session-events.md)
