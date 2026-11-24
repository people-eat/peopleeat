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
   chart**). Each row has View page, SEO, and Analytics (funnel keys only) actions.
4. Page chips are grouped Discovery / Conversion / Account / Legal, including keys with no visits in range. Deselecting every page chip
   returns to the all-pages view.
5. A switch above the chart toggles the dashed prior-range overlay. The switch label and the ranking **vs {range}** column spell out that
   earlier window (same length, immediately before the selected `from`). The overlay defaults **on**. Adding a second series turns it
   **off**; a third or later series keeps the current switch. `previous=0` in the URL stores off.
6. **Audience** defaults to humans (not bot, not impersonation, not admin, not cook), matching the booking-form funnel. **All sessions**
   includes bots and staff for local checks.
7. **Metric** chooses what the line plots and how tables sort (page views vs unique sessions). KPIs always show both unless a comparison is
   active.
8. When exactly one selected key is chefs, cities, venues, occasions, or blog posts:
   - **Scope** can limit index pages vs detail pages while no entities are compared.
   - The global page-key ranking hides so Landing is not mixed into that catalog. A table titled with the page label lists the **overview
     page** (index visits) first, then labeled cities / chefs / venues / occasions / posts. Cities, locations, occasions, and posts include
     the full catalog even at 0 visits. Chefs stay a visit top-20; search covers the rest.
   - A plus on the row **toggles** it into a comparison set (max 8), including overview. The chart overlays one labeled line per selected
     entity. Unique sessions are **not** summed across rows. Selected entities outside the visit ranking stay pinned after overview.
   - **Add city / location / chef / …** searches records by name (2+ characters) so operators can compare pages that are not in the table.
   - Selected names sit as muted outline chips (series color dot plus remove) on top of the chart. Row actions: public page and admin edit.
9. Empty copy distinguishes no visits in range from a catalog key whose detail-looking visits are not tagged with entity ids yet. Index-only
   visits for that key show "no tagged detail pages", not the backfill pending message.
10. Analytics keeps funnels and the booking-form visit KPI, and links here for page-visit charts.
11. Web Pages (SEO) list cards show a 30-day human visit count and link through to Traffic for that key. The SEO editor is unchanged.

Visit tracking skips `/admin/*` and `/profile/*`. `PROFILE` and `ADMINISTRATION` are SEO-only and never appear in the picker.

Cross-catalog overlay (a city vs a venue) is out of scope.

## Decisions

### Alternatives considered

| Option                              | Notes                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| Put charts on Web Pages             | Rejected. Web Pages is SEO title/description editing.                               |
| Expand Analytics with the explorer  | Rejected. Analytics is already a long funnel page; traffic is a different question. |
| Dedicated `/admin/traffic` (chosen) | Insights job: explore visit volume over time, with filters.                         |
| Click-to-replace entity filter      | Rejected. Operators need to overlay Berlin vs Munich on one chart.                  |
| Locale / referrer filters in v1     | Locale is not on the visit; referrer is first-touch on the session. Deferred.       |

### Chosen

First-party `WEB_PAGE_VISITED` aggregates on a Traffic hub. Catalog detail visits store stable entity ids (resolved from the URL slug) so
operators can drill into a city, chef, venue, occasion, or blog post and compare up to 8 of the same catalog. Web Pages only links here.

## Next steps

- Locale and first-touch referrer / landing-path filters.
- Gift-card id on checkout visits; coming-to country as an entity.
- Visit retention or roll-up job (already listed on session events).
- Session samples for a focused page (sessions list has no visit-key filter yet).

## Implementation

- SDL: `AdminWebPageVisitTraffic`, `Admin.webPageVisitTraffic`, `Admin.webPageVisitEntitySearch`, `Admin.webPageVisitCounts`, audience /
  metric / scope enums. `AdminWebPageVisitEntity` takes id lists. Series carry `entityId`, `label`, and previous-period buckets.
- Queries: `adminWebPageVisitTrafficFindOne`, `adminWebPageVisitEntitySearch`, `adminWebPageVisitCountFindMany`
- Visit write: `webPageKeyFromPath` captures catalog path segments; `sessionWebPageVisitParamsResolve` maps slugs to stable ids in
  `sessionWebPageVisitCreate`. Historical `PARTNERS` visit keys rank as `VENUES`. Legacy visit params `partnerId` / `venueId` coalesce to
  `partnerVenueId` (public `/partners` 301s to `/venues`; old partner ids match venue ids).
- Backfill: `sessionWebPageVisitParamsBackfill` (chunked), queued job `session-web-page-visit-params-backfill` enqueued once on worker start
- Indexes: partial `(params.cityId|partnerVenueId|occasionId|blogPostId, createdAt)` on `WEB_PAGE_VISITED` for those keys
- UI: `AdminTrafficPage`, `AdminTrafficEntitySearch`, `AdminOverviewLineChart`, route `traffic.tsx`, nav via `adminCatalog` (`traffic`)
- Architecture: [session-events.md](../architecture/session-events.md)
