# Admin traffic

Operators explore first-party public page visits over time: filterable line charts from `WEB_PAGE_VISITED` session events. The job is
explore ranking, overlay comparable catalog pages, then open the live page, CMS, or SEO from a row.

## Behavior

1. Admins open `/admin/traffic` (sidebar **Traffic**, Insights group, before Analytics).
2. A date range (same picker as Analytics) plus last-7 / 30 / 90-day presets and granularity (day / week / month) drive the chart. Filters
   live in the URL. A **Share** icon sits on the title row (`justify-between`). Its menu’s **Copy link** item copies that URL.
3. **Default** (no pages selected): KPI strip for page views and unique sessions (click a card to choose the chart metric and ranking sort;
   cards use the shared `Button` hover, focus, and pressed states), one line for all public visits, and a ranking table of page keys
   (pageviews, unique sessions, views per session, change vs the same-length window immediately before `from`). A plus (tooltip **Add to
   chart**) on each rank row, or a page chip, toggles that key into the chart, up to 8 series. Selected rows show a minus (**Remove from
   chart**). Each row has View page, SEO, and Analytics actions for `BOOKING_REQUEST_FORM` (Booking tab), `GIFT_CARD` (Gift cards),
   `CHEF_SIGN_UP` (Cooks), and `SIGN_IN` (Sign-in), preserving `from` / `to`.
4. Page chips are grouped Discovery / Conversion / Account / Legal, including keys with no visits in range. Deselecting every page chip
   returns to the all-pages view.
5. A switch above the chart toggles the dashed prior-range overlay. The switch label and the ranking **vs {range}** column spell out that
   earlier window (same length, immediately before the selected `from`). The overlay defaults **on**. Adding a second series turns it
   **off**; a third or later series keeps the current switch. `previous=0` in the URL stores off.
6. **Audience** defaults to humans (not bot, not impersonation, not admin, not cook), matching the booking-form funnel. **All sessions**
   includes bots and staff for local checks.
7. **Metric** chooses what the line plots and how tables sort (page views vs unique sessions). KPIs always show both unless a comparison is
   active.
8. When exactly one selected key is chefs, cities, venues, occasions, blog posts, the booking-request plan, coming-to, or founding-chef:
   - **Scope** can limit index pages vs detail pages while no entities are compared. Coming-to and founding-chef have no index (only country
     hubs), so Scope is hidden and there is no overview row.
   - The global page-key ranking hides so Landing is not mixed into that catalog. A table titled with the page label lists the **overview
     page** (index visits) first when the key has an index, then labeled cities / chefs / venues / occasions / posts / countries. Cities,
     locations, occasions, posts, plan-page venues, and expansion countries include the full catalog even at 0 visits. Chefs stay a visit
     top-20; search covers the rest. Plan ranking is by `?venueId=` (legacy `?partnerId=`); overview is visits with no venue query.
     Coming-to / founding-chef rank by expansion-market slug (`netherlands` / `switzerland`).
   - A plus on the row **toggles** it into a comparison set (max 8), including overview when the key has an index. The chart overlays one
     labeled line per selected entity. Unique sessions are **not** summed across rows. Selected entities outside the visit ranking stay
     pinned after overview.
   - **Add city / location / chef / …** searches records by name (2+ characters) so operators can compare pages that are not in the table.
   - Selected names sit as muted outline chips (series color dot plus remove) on top of the chart. Row actions: public page and admin edit,
     except coming-to / founding-chef (view page only; no Countries CMS).
9. Empty copy distinguishes no visits in range from a catalog key whose detail-looking visits are not tagged with entity ids yet. Index-only
   visits for that key show "no tagged detail pages", not the backfill pending message.
10. Analytics keeps funnels and the booking-form visit KPI, and links here for page-visit charts.
11. Web Pages (SEO) list cards show a 30-day human visit count and link through to Traffic for that key. The SEO editor for a tracked key
    also shows a 90-day human pageviews sparkline and the same Traffic link (key + last 90 days, weekly buckets). That chart is a shortcut,
    not a second explorer: no locale split (visits store a locale-stripped path), no ranking table.

Visit tracking skips `/admin/*` and `/profile/*`. `PROFILE` and `ADMINISTRATION` are SEO-only and never appear in the picker.

Cross-catalog overlay (a city vs a venue) is out of scope.

## Decisions

### Alternatives considered

| Option                                | Notes                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Put the Traffic explorer on Web Pages | Rejected. Ranking, overlays, and filters stay on Traffic. The SEO editor may show a 90-day sparkline plus a link. |
| Expand Analytics with the explorer    | Rejected. Analytics is already a long funnel page; traffic is a different question.                               |
| Dedicated `/admin/traffic` (chosen)   | Insights job: explore visit volume over time, with filters.                                                       |
| Click-to-replace entity filter        | Rejected. Operators need to overlay Berlin vs Munich on one chart.                                                |
| Locale / referrer filters in v1       | Locale is not on the visit; referrer is first-touch on the session. Deferred.                                     |

### Chosen

First-party `WEB_PAGE_VISITED` aggregates on a Traffic hub. Catalog detail visits store stable entity ids (resolved from the URL slug) so
operators can drill into a city, chef, venue, occasion, blog post, or expansion country and compare up to 8 of the same catalog.
Booking-request plan visits store `params.partnerVenueId` from `?venueId=` / `?partnerId=` so operators can see which venue brought the
visitor. Coming-to and founding-chef visits store `params.countryId` as the expansion-market slug (`netherlands` / `switzerland`; ISO `NL` /
`CH` is canonicalized to the slug). There is no Countries table. Web Pages only links here.

## Next steps

- Locale and first-touch referrer / landing-path filters.
- Gift-card id on checkout visits.
- Visit retention or roll-up job (already listed on session events).
- Session samples for a focused page (sessions list has no visit-key filter yet).

## Implementation

- SDL: `AdminWebPageVisitTraffic`, `Admin.webPageVisitTraffic`, `Admin.webPageVisitEntitySearch`, `Admin.webPageVisitCounts`, audience /
  metric / scope enums. `AdminWebPageVisitEntity` takes id lists. Series carry `entityId`, `label`, and previous-period buckets.
- Queries: `adminWebPageVisitTrafficFindOne`, `adminWebPageVisitEntitySearch`, `adminWebPageVisitCountFindMany`
- Visit write: `webPageKeyFromPath` captures catalog path segments, the plan-page `venueId` / `partnerId` query, and coming-to /
  founding-chef country slugs; `sessionWebPageVisitParamsResolve` maps slugs or ids to stable ids in `sessionWebPageVisitCreate` (country
  accepts slug or ISO, persists slug). Public `/partners` 301s to `/venues`; the path map still records those URLs as `VENUES`. Plan visits
  store a sanitized `/booking-request/plan?venueId=…` path (not the full search, which can include `firstName`).
- Backfill: `sessionWebPageVisitParamsBackfill` (chunked), queued job `session-web-page-visit-params-backfill` enqueued once on worker
  start. Historical plan visits that stored pathname only cannot recover venue attribution. Historical coming-to / founding-chef visits
  recover `countryId` from the stored path.
- Indexes: partial `(params.cityId|partnerVenueId|occasionId|blogPostId|countryId, createdAt)` on `WEB_PAGE_VISITED` for those keys, plus
  `BOOKING_REQUEST_PLAN` × `partnerVenueId`, `COMING_TO` × `countryId`, and `FOUNDING_CHEF` × `countryId`
- UI: `AdminTrafficPage`, `AdminTrafficEntitySearch`, `AdminOverviewLineChart`, `adminTrafficLinks.ts` (Analytics action uses
  `adminAnalyticsSearchForPageKey`), route `traffic.tsx`, nav via `adminCatalog` (`traffic`)
- Architecture: [session-events.md](../architecture/session-events.md)
