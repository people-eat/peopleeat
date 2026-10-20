# Admin analytics

Operators inspect first-party product analytics: booking-form, gift-card, chef sign-up, and cook offer creation funnels, plus page-visit
time series.

## Behavior

1. Admins open `/admin/analytics` (sidebar **Analysen** / **Analytics**).
2. A date range (same overview picker pattern as sessions/logs) drives all widgets.
3. **Overview KPIs** — form visits (sum of `WEB_PAGE_VISITED` buckets for `BOOKING_REQUEST_FORM`), sessions with any funnel completion
   (`step_completed` or `BOOKING_REQUEST_CREATED`), booking requests created, and visit→create conversion %.
4. **Booking form funnel**
   - **Step table** — per-step distinct sessions that `step_entered` (reached) vs `step_completed` (completed), plus drop-off % from the
     previous step’s completions. Terminal `created` comes from `BOOKING_REQUEST_CREATED` (no entered count). The **Reached** column is
     hidden when every step’s entered count is 0 (typical for migrated traffic that only has `step_completed`).
   - **Sankey** — forward transitions between consecutive `step_completed` steps (plus `created`) for the same session. Backward edits
     (later step → earlier step) are dropped so the graph stays a DAG Recharts can lay out. Shown only when at least one forward link
     exists.
5. **Gift card funnel** — session-grain steps `configure` → `auth` → `created` → `checkout` → `paid` (human non-admin/non-cook). Terminals
   from `GIFT_CARD_CREATED` / `GIFT_CARD_PAYED`.
6. **Chef sign-up funnel** — session-grain steps `auth` → `profile` → `created` (human non-admin; cooks included). Terminal from
   `COOK_CREATED`.
7. **Cook offer funnel** (cook × booking-request grain)
   - **Cohort** — `BookingRequestCooks` rows with `notifiedAt` in range (admins excluded).
   - **KPIs** — notified, opened, declined (decline without create-UI path), offers created, conversion notified→offer.
   - **Opened** — `firstOpenedAt`, or inferred when the row later declined / started create / has an offer (older imported rows often lack
     `firstOpenedAt`).
   - **Steps** — `notified` → `opened` → either `declined` **or** `offer_create` → `menus` → `price` → `created`. Early/terminal steps from
     `BookingRequestCooks` / `BookingRequestOffers`; create-UI mid-steps from `WEB_PAGE_INTERACTION` with `area: cook_booking_request_offer`
     and `bookingRequestId`.
   - **Drop-off %** — vs the graph parent (`declined` and `offer_create` both vs `opened`), not vs the previous table row. Negative values
     meant the UI was wrongly comparing the offer branch to the decline branch.
   - **Sankey** — forward-only edges on that per-row sequence (decline branches off opened).
8. **Visit charts** — zero-filled day buckets of `WEB_PAGE_VISITED` for `BOOKING_REQUEST_FORM` and `LANDING` (all sessions; not filtered to
   non-admin/non-cook).

### Funnel filters and empty states

- Booking-form funnel aggregation includes only **human** sessions (`isBot = false`) whose `userId` is **not** an admin or cook.
- Cook offer funnel uses notified cook affinities (not session grain); create-UI events still require a human non-admin cook session.
- Visit charts do **not** apply that filter, so bars can show traffic while the funnel is empty (e.g. admin self-tests, bots, or visits
  without structured completions).
- Empty Sankey copy distinguishes: no structured completions yet; completions but no multi-step transitions; or no data at all.
- Booking-form funnel aggregation only counts the structured `{ area: booking_request_form, interaction: { type, step } }` shape (plus
  `BOOKING_REQUEST_CREATED`). Imported historical clicks were reshaped into `step_completed` where mapping was known; unmatched free-form
  clicks still do not appear. Migrated rows have no `step_entered`, so the Reached column is omitted until live instrumentation produces
  entered events.
- Cook create-UI mid-steps (`offer_create` / `menus` / `price`) only appear after live instrumentation; historical cohorts still show
  notified / opened / declined / created from DB timestamps.

Session and user event timelines live on session detail and the user **session-events** tab (see [admin-sessions.md](./admin-sessions.md)
and [admin-users.md](./admin-users.md)).

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

1. **Medium — Marketplace journey** — cook/menu views, offer accept, payment events on the same store.
2. **Medium — Retention job** — prune or roll up old pageviews.
3. **Low — More visit keys** — e.g. chefs index, gift card.
4. **Low — Staff include toggle** — optionally include admin/cook sessions for local verification.

## Implementation

- SDL: `AdminSessionEvent`, `AdminAnalyticsBookingRequestFormFlow`, `AdminAnalyticsSessionFunnelFlow`,
  `AdminAnalyticsCookBookingRequestOfferFlow`, `AdminAnalyticsFunnelStepStats`, `Admin.bookingRequestFormFlow`, `Admin.giftCardFlow`,
  `Admin.chefSignUpFlow`, `Admin.cookBookingRequestOfferFlow`, `Admin.sessionEventWebPageVisitCreations`, `Admin.sessionEvents`,
  `Admin.sessionEventsCounts`
- Queries: `adminAnalyticsBookingRequestFormFlow`, `adminAnalyticsGiftCardFlow`, `adminAnalyticsChefSignUpFlow`,
  `adminAnalyticsCookBookingRequestOfferFlow`, `adminSessionEventWebPageVisitCreationsFindMany`, `adminSessionEventFindMany`
- Mapper: `toGqlAdminSessionEvent`
- Shared steps: `src/shared/bookingRequestFormFunnel.ts`, `src/shared/cookBookingRequestOfferFunnel.ts`, `src/shared/giftCardFunnel.ts`,
  `src/shared/chefSignUpFunnel.ts`
- UI: `AdminAnalyticsPage`, route `analytics.tsx`, nav via `adminCatalog` (`analytics` stub slug with real page)
- Architecture: [session-events.md](../architecture/session-events.md)
