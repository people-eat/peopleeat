# Cook analytics

Cooks see marketplace and discovery insights on their profile overview and a dedicated analytics page.

## Behavior

1. When `COOK_ANALYTICS` is on for the cook, the sidebar shows **Analysen** / **Analytics** at `/profile/analytics`.
2. The page offers rolling period presets: past week, past month (default), past quarter, past year (`?period=`), plus a lead-channel
   filter: all (default), direct / “requested you”, or pool (`?channel=`). Defaults are omitted from the URL.
3. Page layout (outcome-first; each section answers one cook question):
   - **Your bookings** — paid cook payout, paid booking count, typical menu price on offers sent (channel-scoped), with offers sent and
     typical time to open in the subtitle.
   - **Highlights** — up to two `StatusAlert` callouts from funnel gaps, catalog gaps (a dish opened often but never chosen), or strong
     addon follow-through.
   - **What guests book** — ranked lists (max 8) of menus, dishes, and extras. Menus: chef-page opens, chef-page requests
     (`BookingRequestCooks.requestedMenuId`), chosen on dual-accepted offers (`configuredMenu` → `Menus.copyOfMenuId`), paid. Dishes:
     chef-page opens and chosen/paid (snapshot `mealId`, else title match on that offer menu’s options). Extras: offered, selected
     (`customerSelected`), paid. Chef-page opens ignore the request-type filter; offered / chosen / paid respect it. Ad-hoc offer menus
     without `copyOfMenuId` are omitted. Titles link to the cook’s inventory pages.
   - **Your chef page** — human visit count (never channel-filtered) plus a trend of visits vs paid bookings (day buckets for week/month,
     week buckets for quarter/year). Offers-created is a fallback series only when visits and paid are both zero.
   - **How requests become bookings** — Direct and/or Pool horizontal bar charts with entry→paid and opened-of-entry lines. Direct stages:
     requested you → opened → offer sent → both accepted → paid. Pool adds a declined terminal branch after opened. Median notify→open and
     notify→offer sit under the funnels. Open / decline / offer-after-open rates live on funnel step tooltips, not a second meter strip.
4. Channel definitions: **Direct** = `BookingRequests.requestedCookId = cookId` (chef-page lead, including after expand). **Pool** =
   notified affinity where the request is not Direct-to-this-cook. Opened prefers `firstOpenedAt` and also infers open when the cook later
   declined, started create-UI, or created an offer (same spirit as admin cook-offer funnel).
5. The cook overview (`/profile`) shows a compact past-month strip (payout, paid bookings, time to open, chef-page visits) with a link to
   the full page **only when the cook already has lifetime activity** (any notified request, any offer, or any public profile visit).
   Brand-new cooks see no analytics section and no wall of zeros.
6. The full page with no lifetime activity shows a single calm empty note without period/channel controls; filters appear once there is
   lifetime activity. Direct visits while the toggle is off redirect to `/profile`.
7. Profile views count human (`isBot = false`) `WEB_PAGE_VISITED` events for `CHEFS` with `params.cookId` matching the cook (detail pages,
   not the listing). Menu and meal opens count public chef-page dialog opens (`click` / `menu_open` or `meal_open` on `area: chefs`),
   excluding bots and impersonation. Opens start from instrumentation; there is no historical backfill.

## Decisions

### Alternatives considered

| Option                                       | Notes                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Overview-only KPIs                           | Harder to explore periods and the full metric set                                               |
| Always show zero KPIs after registration     | Noisy and demotivating before any marketplace or discovery activity                             |
| Custom date-range picker like admin          | Extra chrome for v1; rolling presets cover the useful cook questions                            |
| Platform / peer benchmarks                   | Sensitive and hard to explain; deferred                                                         |
| New client instrumentation for response time | Pool open already stamps `firstOpenedAt`; chef visits already tracked                           |
| Blended Direct + Pool metrics only           | Hid the chef-page conversion story cooks care about most                                        |
| Numbers-only StatCard wall                   | Weak selling point; cooks need charts, explanations, flow                                       |
| Sankey plus rate meters plus funnel bars     | Same request path three times; cooks need catalog performance instead                           |
| Offer-form mid-step chart on cook analytics  | Same offer-sent story as the funnel; too operational. Admin analytics keeps create-UI mid-steps |
| Composite “best performing” score            | Opaque; ranked counts cooks can trust are clearer                                               |

### Chosen

Feature-toggled cook-scoped aggregates over affinity timestamps, offers, chef-page visits, and catalog dialog opens. Overview stays quiet
until there is something useful to show; the full page remains discoverable via the sidebar when the toggle is on. Hero leads with money and
paid bookings; ranked catalog lists answer what guests book; channel split still separates Direct from Pool on marketplace numbers only. The
page uses Recharts bars, trend buckets, insight callouts, and metric help tooltips. Peer benchmarks stay deferred. Create-UI mid-steps stay
on admin analytics, not the cook page.

## Next steps

- Peer benchmarks only with clear privacy and product framing
- Profile-view → direct-request attribution (needs new instrumentation)

## Implementation

- Toggle: `COOK_ANALYTICS` in `src/shared/featureToggle.ts` + GraphQL `FeatureToggleKey`; admin labels in
  `src/web/pages/admin/adminFeatureToggles.ts`
- GraphQL: `Cook.analytics(period, channel)` → `CookAnalytics` (null when toggle off) in `schema.graphqls`; funnel stage types alongside
- Query: `src/server/queries/cookAnalyticsFind.ts` (toggle gate + SQL aggregates; medians via `PERCENTILE_CONT`; Direct/Pool funnels;
  create-UI interactions still infer opened; zero-filled `trend` buckets; catalog rankings as extra queries, cap 8)
- Period / channel helpers: `src/shared/cookAnalyticsPeriod.ts`, `src/shared/cookAnalyticsChannel.ts`
- Index: `SessionEvents_webPageVisit_chefs_cookId_createdAt_idx` (partial on CHEFS visits by `params.cookId`)
- UI: `ProfileCookAnalyticsPage`, `CookAnalyticsSections` (Recharts + tooltips), overview strip in `ProfilePageCook`, nav in `cookCatalog` /
  `CookSidebar`
- Related: [admin-feature-toggles.md](./admin-feature-toggles.md), [cook-profile.md](./cook-profile.md), [cook-shell.md](./cook-shell.md),
  [session-events.md](../architecture/session-events.md), [admin-analytics.md](./admin-analytics.md)
