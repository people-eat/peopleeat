# Cook analytics

Cooks see marketplace and discovery insights on their profile overview and a dedicated analytics page.

## Behavior

1. When `COOK_ANALYTICS` is on for the cook, the sidebar shows **Analysen** / **Analytics** at `/profile/analytics`.
2. The page offers rolling period presets: past week, past month (default), past quarter, past year (`?period=`).
3. Metrics include public chef-profile views, pool responsiveness (notified / opened / declined, open and decline rates, median time
   notify→open and notify→first offer), and offer economics (created, dual-accept conversion, paid count, cook payout total, average menu
   price, average participants).
4. The cook overview (`/profile`) shows a compact past-month strip (profile views, time to open, offers, conversion) with a link to the full
   page **only when the cook already has lifetime activity** (any notified request, any offer, or any public profile visit). Brand-new cooks
   see no analytics section and no wall of zeros.
5. The full page with no lifetime activity shows a single calm empty note (period control still visible). Direct visits while the toggle is
   off redirect to `/profile`.
6. Profile views count human (`isBot = false`) `WEB_PAGE_VISITED` events for `CHEFS` with `params.cookId` matching the cook (detail pages,
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

### Chosen

Feature-toggled cook-scoped aggregates over existing affinity timestamps, offers, and session visit events. Overview stays quiet until there
is something useful to show; the full page remains discoverable via the sidebar when the toggle is on.

## Next steps

- Optional simple visit / offer time series once cooks ask for trends
- Peer benchmarks only with clear privacy and product framing

## Implementation

- Toggle: `COOK_ANALYTICS` in `src/shared/featureToggle.ts` + GraphQL `FeatureToggleKey`; admin labels in
  `src/web/pages/admin/adminFeatureToggles.ts`
- GraphQL: `Cook.analytics(period)` → `CookAnalytics` (null when toggle off) in `schema.graphqls`
- Query: `src/server/queries/cookAnalyticsFind.ts` (toggle gate + SQL aggregates; medians via `PERCENTILE_CONT`)
- Period helpers: `src/shared/cookAnalyticsPeriod.ts`
- Index: `SessionEvents_webPageVisit_chefs_cookId_createdAt_idx` (partial on CHEFS visits by `params.cookId`)
- UI: `ProfileCookAnalyticsPage`, overview strip in `ProfilePageCook`, nav in `cookCatalog` / `CookSidebar`
- Related: [admin-feature-toggles.md](./admin-feature-toggles.md), [cook-profile.md](./cook-profile.md), [cook-shell.md](./cook-shell.md),
  [session-events.md](../architecture/session-events.md)
