# Cook analytics

Cooks see marketplace and discovery insights on their profile overview and a dedicated analytics page.

## Behavior

1. When `COOK_ANALYTICS` is on for the cook, the sidebar shows **Analysen** / **Analytics** at `/profile/analytics`.
2. The page offers rolling period presets: past week, past month (default), past quarter, past year (`?period=`), plus a lead-channel
   filter: all (default), direct / “requested you”, or pool (`?channel=`). Defaults are omitted from the URL.
3. Page layout (outcome-first, chart-forward):
   - **Your results** — paid cook payout, paid booking count, dual-accept conversion (channel-scoped), with help tooltips.
   - **Highlights** — short insight callouts derived from rates / funnel gaps (at most two).
   - **Activity over time** — Recharts grouped bars for profile visits, offers created, and paid bookings (day buckets for week/month, week
     buckets for quarter/year).
   - **How requests turn into bookings** — Direct and/or Pool panels with horizontal bar charts, entry→paid summary, help copy, and a Sankey
     flow when entry count ≥ 5. Direct stages: requested you → opened → offer sent → both accepted → paid. Pool adds a declined terminal
     branch after opened; offer-sent conversion parents off opened.
   - **Speed and pass-ups** — meter bars for open / decline / offer rates plus median notify→open / notify→offer, each with tooltips.
   - **Public chef page** — human profile visits for the period (never channel-filtered).
   - **Where offer drafts stop** — collapsed create-UI mid-steps as a chart (`offer_create` → `menus` → `price` → `message` → `created`).
4. Channel definitions: **Direct** = `BookingRequests.requestedCookId = cookId` (chef-page lead, including after expand). **Pool** =
   notified affinity where the request is not Direct-to-this-cook. Opened prefers `firstOpenedAt` and also infers open when the cook later
   declined, started create-UI, or created an offer (same spirit as admin cook-offer funnel).
5. The cook overview (`/profile`) shows a compact past-month strip (profile views, time to open, offers, conversion) with a link to the full
   page **only when the cook already has lifetime activity** (any notified request, any offer, or any public profile visit). Brand-new cooks
   see no analytics section and no wall of zeros.
6. The full page with no lifetime activity shows a single calm empty note (period and channel controls still visible). Direct visits while
   the toggle is off redirect to `/profile`.
7. Profile views count human (`isBot = false`) `WEB_PAGE_VISITED` events for `CHEFS` with `params.cookId` matching the cook (detail pages,
   not the listing).

## Decisions

### Alternatives considered

| Option                                       | Notes                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------- |
| Overview-only KPIs                           | Harder to explore periods and the full metric set                     |
| Always show zero KPIs after registration     | Noisy and demotivating before any marketplace or discovery activity   |
| Custom date-range picker like admin          | Extra chrome for v1; rolling presets cover the useful cook questions  |
| Platform / peer benchmarks                   | Sensitive and hard to explain; deferred                               |
| New client instrumentation for response time | Pool open already stamps `firstOpenedAt`; chef visits already tracked |
| Blended Direct + Pool metrics only           | Hid the chef-page conversion story cooks care about most              |
| Numbers-only StatCard wall                   | Weak selling point; cooks need charts, explanations, flow             |

### Chosen

Feature-toggled cook-scoped aggregates over existing affinity timestamps, offers, and session visit / offer-create interactions. Overview
stays quiet until there is something useful to show; the full page remains discoverable via the sidebar when the toggle is on. Hero and
funnels lead with money and conversion; channel split separates Direct from Pool; the page uses Recharts bars, optional Sankey at sufficient
volume, trend buckets, insight callouts, and metric help tooltips. Peer benchmarks stay deferred.

## Next steps

- Peer benchmarks only with clear privacy and product framing
- Profile-view → direct-request attribution (needs new instrumentation)

## Implementation

- Toggle: `COOK_ANALYTICS` in `src/shared/featureToggle.ts` + GraphQL `FeatureToggleKey`; admin labels in
  `src/web/pages/admin/adminFeatureToggles.ts`
- GraphQL: `Cook.analytics(period, channel)` → `CookAnalytics` (null when toggle off) in `schema.graphqls`; funnel / offer-create stage
  types alongside
- Query: `src/server/queries/cookAnalyticsFind.ts` (toggle gate + SQL aggregates; medians via `PERCENTILE_CONT`; Direct/Pool funnels;
  cook-scoped create-UI mid-steps from `WEB_PAGE_INTERACTION` / `area: cook_booking_request_offer`; zero-filled `trend` buckets)
- Period / channel helpers: `src/shared/cookAnalyticsPeriod.ts`, `src/shared/cookAnalyticsChannel.ts`
- Index: `SessionEvents_webPageVisit_chefs_cookId_createdAt_idx` (partial on CHEFS visits by `params.cookId`)
- UI: `ProfileCookAnalyticsPage`, `CookAnalyticsSections` (Recharts + tooltips), overview strip in `ProfilePageCook`, nav in `cookCatalog` /
  `CookSidebar`
- Related: [admin-feature-toggles.md](./admin-feature-toggles.md), [cook-profile.md](./cook-profile.md), [cook-shell.md](./cook-shell.md),
  [session-events.md](../architecture/session-events.md), [admin-analytics.md](./admin-analytics.md)
