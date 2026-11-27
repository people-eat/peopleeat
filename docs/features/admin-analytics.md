# Admin analytics

Operators inspect first-party product analytics: booking-form, gift-card, booking-checkout, chef sign-up, and cook offer creation funnels,
sign-in method usage, and cook session activity. Page-visit time series live on [admin-traffic.md](./admin-traffic.md).

## Behavior

1. Admins open `/admin/analytics` (sidebar **Analysen** / **Analytics**). The chrome breadcrumb and document title name the page; there is
   no in-page heading or subtitle. Tabs and the date-range picker share the first row.
2. A date range (same overview picker pattern as sessions/logs) drives all widgets. URL `tab` groups the page (default **Booking**, omitted
   from the URL). Switching tabs keeps `from` / `to`. Only the active tab’s aggregations load (`@include`).
3. **Booking** tab
   - **Overview KPIs** — form visits (sum of `WEB_PAGE_VISITED` buckets for `BOOKING_REQUEST_FORM`, links to Traffic for that key), sessions
     with any funnel completion (`step_completed` or `BOOKING_REQUEST_CREATED`), booking requests created (links to the booking-requests
     overview with the same range), and visit→create conversion %. Caption: form visits include every session; funnel counts are human
     non-admin/non-cook sessions; the booking-requests overview counts database rows, including admin-created requests.
   - **Booking form funnel** — line tabs switch **Sankey** and **Table** (same data, one view at a time). Defaults to Sankey when at least
     one forward link exists, otherwise Table.
     - **Step table** — per-step distinct sessions. **Reached** is `step_entered` ∪ `step_completed` so completed never exceeds reached
       (migrated rows and lost enter events still count as reached). **Completed** is `step_completed`. Drop-off % is from the previous
       visible step’s completions (hidden when completed ≥ previous, so the column never goes negative). Terminal `created` comes from
       `BOOKING_REQUEST_CREATED` (no entered count). The **Reached** column is hidden when every client step’s entered count is 0.
     - **Sankey** — one path per session: the unique completed steps in catalog order, consecutive pairs (skips allowed). Each session
       contributes at most 1 to any edge. Empty copy when there is no forward link.
   - **Booking checkout funnel** — session-grain steps `checkout` → `paid` (human non-admin/non-cook). Client mid-step on the customer offer
     checkout page; terminal from `BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED`. Webhook / pull-payment jobs attach `paid` to the session that
     already has checkout interactions for that request when no GraphQL `sessionId` is present.
   - **Marketplace after create** — request-row counts in range (`BookingRequests.createdAt`), not sessions and not GMV: requests, share
     with ≥1 offer, share dual-accepted, share paid (`PAYED` / `TRANSFERRED` / `PAYED_OUT_OF_SYSTEM`), payment-failed count (`FAILED`), and
     chef-page vs radius publication split. Dual-accept conversion chart and GMV stay on the booking-requests overview.
   - **Active customers** — same `lastInteractionAt` last-touch rules as cooks, for humans who are not cooks or admins (bots and
     impersonation excluded). Range KPI plus zero-filled month and week bars.
4. **Cooks** tab
   - **Active cooks** — distinct `Cooks` whose human, non-admin, non-impersonation session has `lastInteractionAt` in range (bots and
     impersonation excluded; unapproved / invisible cooks count). Profile visits are not in `WEB_PAGE_VISITED` (`/profile/*` is skipped), so
     session last-touch is the cook-activity signal. KPI is that distinct count for the whole range. Zero-filled **month** and **week**
     (ISO, Monday) bar charts group `COUNT(DISTINCT cookId)` by `date_trunc` of `lastInteractionAt`. A cook with sessions in two months
     appears in both bars and still counts as 1 in the KPI. A long-lived session only contributes to the bucket of its _latest_
     `lastInteractionAt`, so historical bars are a lower bound for cooks who never sign out. The current bucket and the range KPI stay
     accurate. Session overlap (`createdAt`…`lastInteractionAt`) is not used (it would count idle months).
   - **Productive cooks** — distinct non-admin cooks who created at least one offer in range (`BookingRequestOffers.createdAt`), shown next
     to session-active cooks.
   - **Chef sign-up funnel** — session-grain steps `auth` → `profile` → `created` (human non-admin; cooks included). Terminal from
     `COOK_CREATED`.
   - **Cook offer funnel** (cook × booking-request grain)
     - **Cohort** — `BookingRequestCooks` rows with `notifiedAt` in range (admins excluded).
     - **KPIs** — notified, opened, declined (decline without create-UI path), offers created, conversion notified→offer, median minutes
       from notify to first offer (shown as hours; null when no offer in the cohort has `createdAt >= notifiedAt`).
     - **Opened** — `firstOpenedAt`, or inferred when the row later declined / started create / has an offer (older imported rows often lack
       `firstOpenedAt`).
     - **Steps** — `notified` → `opened` → either `declined` **or** `offer_create` → `menus` → `price` → `message` → `created`.
       Early/terminal steps from `BookingRequestCooks` / `BookingRequestOffers`; create-UI mid-steps from `WEB_PAGE_INTERACTION` with
       `area: cook_booking_request_offer` and `bookingRequestId`. Historical offers with no UI events skip mid-steps (`notified` → `opened`
       → `created`). Completing a later client step infers earlier client steps as passed through; the offer row itself does not.
     - **Drop-off %** — vs the graph parent (`declined` and `offer_create` both vs `opened`; `created` vs `message`), not vs the previous
       table row.
     - **Sankey** — completed steps only, consecutive pairs on that per-row sequence (decline branches off opened; skip-edges when mid-steps
       are missing). Same Sankey / Table toggle as the booking form funnel.
5. **Sign-in** tab — human non-impersonation sessions in range (cooks included, bots and admin impersonation excluded). KPI strip: sign-ins,
   registration tickets, accounts created, failure rate. Per-method table for Email OTP, Passkey, Google, and Facebook: sign-ins,
   registration tickets, accounts created, failures. Daily grouped bar chart of sign-ins. OAuth account creates are
   `AUTH_OAUTH_ACCOUNT_CREATED`; email account creates are `USER_CREATE_SUCCESSFUL` minus those OAuth creates.
6. **Gift cards** tab — visit KPI (sum of `WEB_PAGE_VISITED` for `GIFT_CARD`, links to Traffic) and visit→paid %, then session-grain steps
   `configure` → `auth` → `created` → `checkout` → `paid` (human non-admin/non-cook). `GIFT_CARD_CREATED` maps to `created`;
   `GIFT_CARD_PAYED` maps to `paid`. **Paid** KPI / `terminalCount` is sessions that paid, not sessions that only created a prepared card.
   Purchase volume lives on the gift-cards overview.
7. **Cross-links** — each tab ends with outline buttons to its matching overview (or cook list) and to Traffic with the same `from` / `to`
   and the tab’s page key. Booking-requests, gift-cards, users, and sessions overviews put an **Analytics** outline button on the relevant
   section heading row (same range). Traffic ranking **Analytics** actions pass the correct tab (`BOOKING_REQUEST_FORM` → Booking,
   `GIFT_CARD` → Gift cards, `CHEF_SIGN_UP` → Cooks, `SIGN_IN` → Sign-in).
8. **Page visits** — the form-visit KPI still sums `WEB_PAGE_VISITED` for `BOOKING_REQUEST_FORM`. Line charts and filters for every public
   page live on `/admin/traffic` ([admin-traffic.md](./admin-traffic.md)).

### Funnel filters and empty states

- Booking-form / gift-card / booking-checkout funnel aggregation includes only **human** sessions (`isBot = false`) whose `userId` is
  **not** an admin or cook.
- Cook offer funnel uses notified cook affinities (not session grain); create-UI events still require a human non-admin cook session.
- Cook session activity joins `Sessions` to `Cooks` on `userId = cookId`, excludes bots, impersonation, and admin accounts, and does not
  require `isApprovedByAdmin` / `isVisible`. Customer session activity uses the same last-touch rules for humans who are not cooks or
  admins.
- Form-visit and gift-card visit KPI buckets do **not** apply that filter, so the visit count can be above funnel completions (e.g. admin
  self-tests, bots, or visits without structured completions). Traffic’s default audience is humans.
- Empty Sankey copy distinguishes: no structured completions yet; completions but no multi-step transitions; or no data at all. Funnel
  Sankey and the step table are alternative views (line tabs on the funnel heading). Default is Sankey when at least one forward link
  exists, otherwise Table. Every funnel block uses the same toggle (booking form, checkout, chef sign-up, cook offer, gift card).
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

| Option                                    | Notes                                                              |
| ----------------------------------------- | ------------------------------------------------------------------ |
| Nest analytics under `/admin/sessions`    | Rejected — different job (aggregates vs session triage)            |
| Dedicated `/admin/analytics` hub (chosen) | Aggregates and funnels need their own surface, not session triage  |
| Metabase only                             | External; no in-product funnel                                     |
| Cook funnel per browser session           | Rejected — notify has no cook session; conversion is per request   |
| Extra `/admin/analytics/*` routes         | Rejected — URL `tab` plus `@include` keeps one range and one page  |
| Session-overlap MAU                       | Rejected — `createdAt`…`lastInteractionAt` would count idle months |

### Chosen

In-app overview with KPIs, step table, Sankey + visit buckets; event store documented in
[session-events.md](../architecture/session-events.md). Cook offer funnel uses cook × booking-request grain. The long funnel stack is split
into Booking / Cooks / Sign-in / Gift cards tabs. Cook activity uses session `lastInteractionAt` (profile visits are not tracked).

## Next steps

1. **Medium — Retention job** — prune or roll up old pageviews.
2. **Low — Staff include toggle** — optionally include admin/cook sessions for local verification.
3. **Low — Cook activation** — menu create / Stripe Connect / availability after chef sign-up.
4. **Later — Cook retention** — cooks active in month N who return in N+1. Needs a better activity log than sticky `lastInteractionAt`.

Dual-accept conversion and GMV stay on the booking-requests overview; do not duplicate them here.

## Implementation

- SDL: `AdminSessionEvent`, `AdminAnalyticsBookingRequestFormFlow`, `AdminAnalyticsSessionFunnelFlow`,
  `AdminAnalyticsCookBookingRequestOfferFlow`, `AdminAnalyticsCookSessionActivity`, `AdminAnalyticsCustomerSessionActivity`,
  `AdminAnalyticsBookingRequestMarketplaceStats`, `AdminAnalyticsFunnelStepStats`, `AdminSignInMethodStats`, `Admin.bookingRequestFormFlow`,
  `Admin.giftCardFlow`, `Admin.bookingRequestCheckoutFlow`, `Admin.chefSignUpFlow`, `Admin.cookBookingRequestOfferFlow`,
  `Admin.cookSessionActivity`, `Admin.customerSessionActivity`, `Admin.bookingRequestMarketplaceStats`, `Admin.signInMethodStats`,
  `Admin.sessionEventWebPageVisitCreations`, `Admin.sessionEvents`, `Admin.sessionEventsCounts`
- Queries: `adminAnalyticsBookingRequestFormFlow`, `adminAnalyticsGiftCardFlow`, `adminAnalyticsBookingRequestCheckoutFlow`,
  `adminAnalyticsChefSignUpFlow`, `adminAnalyticsCookBookingRequestOfferFlow`, `adminAnalyticsCookSessionActivityFindOne`,
  `adminAnalyticsCustomerSessionActivityFindOne`, `adminAnalyticsBookingRequestMarketplaceStatsFindOne`, `adminAnalyticsSignInMethodStats`,
  `adminSessionEventWebPageVisitCreationsFindMany`, `adminSessionEventFindMany`
- Mapper: `toGqlAdminSessionEvent`
- Shared steps: `src/shared/bookingRequestFormFunnel.ts`, `src/shared/cookBookingRequestOfferFunnel.ts`, `src/shared/giftCardFunnel.ts`,
  `src/shared/chefSignUpFunnel.ts`, `src/shared/bookingRequestCheckoutFunnel.ts`, `src/shared/chefsDiscovery.ts`
- UI: `AdminAnalyticsPage` (chrome + tabs), `AdminAnalyticsBookingTab`, `AdminAnalyticsCooksTab`, `AdminAnalyticsSignInTab`,
  `AdminAnalyticsGiftCardsTab`, `AdminAnalyticsFunnelBlock`, `adminAnalyticsSearch.ts`, `AdminRelatedPageLink`, route `analytics.tsx`, nav
  via `adminCatalog` (`analytics` stub slug with real page)
- Indexes: visit buckets use `SessionEvents_webPageVisit_webPageKey_createdAt_idx` (partial on `WEB_PAGE_VISITED`); cook session activity
  uses `Sessions_lastInteractionAt_idx`; overview time-buckets also rely on `createdAt` indexes on `Users`, `Logs`, `BookingRequests`,
  `Chats`, `CookCallSlotBookings`
- Architecture: [session-events.md](../architecture/session-events.md)
