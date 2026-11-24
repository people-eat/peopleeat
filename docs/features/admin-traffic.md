# Admin traffic

Operators explore first-party public page visits over time: filterable line charts from `WEB_PAGE_VISITED` session events.

## Behavior

1. Admins open `/admin/traffic` (sidebar **Traffic**, Insights group, before Analytics).
2. A date range (same picker as Analytics) plus granularity (day / week / month) drive the chart. Filters live in the URL.
3. **Default** (no pages selected): KPI strip for page views and unique sessions, one line for all public visits, and a ranking table of
   page keys. Clicking a rank row (or a page chip) toggles that key into the chart, up to 8 series.
4. **Audience** defaults to humans (not bot, not impersonation, not admin, not cook), matching the booking-form funnel. **All sessions**
   includes bots and staff for local checks.
5. **Metric** chooses what the line plots (page views vs unique sessions). KPIs always show both.
6. When exactly one selected key is chefs, cities, venues, occasions, or blog posts:
   - **Scope** can limit index pages (no entity id) vs detail pages (entity id present).
   - The global page-key ranking hides so Landing is not mixed into that catalog. A table titled with the page label lists the **overview
     page** (index visits) first, then a top-20 of labeled cities / chefs / venues / occasions / posts. Clicking a row drills the chart.
7. Empty copy distinguishes no visits in range from a catalog key whose detail-looking visits are not tagged with entity ids yet. Index-only
   visits for that key show "no tagged detail pages", not the backfill pending message.
8. Analytics keeps funnels and the booking-form visit KPI, and links here for page-visit charts.
9. Web Pages (SEO) list cards show a 30-day human visit count and link through to Traffic for that key. The SEO editor is unchanged.

Visit tracking skips `/admin/*` and `/profile/*`. `PROFILE` and `ADMINISTRATION` are SEO-only and never appear in the picker.

## Decisions

### Alternatives considered

| Option                              | Notes                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| Put charts on Web Pages             | Rejected. Web Pages is SEO title/description editing.                               |
| Expand Analytics with the explorer  | Rejected. Analytics is already a long funnel page; traffic is a different question. |
| Dedicated `/admin/traffic` (chosen) | Insights job: explore visit volume over time, with filters.                         |
| Locale / referrer filters in v1     | Locale is not on the visit; referrer is first-touch on the session. Deferred.       |

### Chosen

First-party `WEB_PAGE_VISITED` aggregates on a Traffic hub. Catalog detail visits store stable entity ids (resolved from the URL slug) so
operators can drill into a city, chef, venue, occasion, or blog post. Web Pages only links here.

## Next steps

- Locale and first-touch referrer / landing-path filters.
- Gift-card id on checkout visits; coming-to country as an entity.
- Visit retention or roll-up job (already listed on session events).

## Implementation

- SDL: `AdminWebPageVisitTraffic`, `Admin.webPageVisitTraffic`, `Admin.webPageVisitCounts`, audience / metric / scope enums
- Queries: `adminWebPageVisitTrafficFindOne`, `adminWebPageVisitCountFindMany`
- Visit write: `webPageKeyFromPath` captures catalog path segments; `sessionWebPageVisitParamsResolve` maps slugs to stable ids in
  `sessionWebPageVisitCreate`. Historical `PARTNERS` visit keys rank as `VENUES`. Legacy visit params `partnerId` / `venueId` coalesce to
  `partnerVenueId` (public `/partners` 301s to `/venues`; old partner ids match venue ids).
- Backfill: `sessionWebPageVisitParamsBackfill` (chunked), queued job `session-web-page-visit-params-backfill` enqueued once on worker start
- Indexes: partial `(params.cityId|partnerVenueId|occasionId|blogPostId, createdAt)` on `WEB_PAGE_VISITED` for those keys
- UI: `AdminTrafficPage`, `AdminOverviewLineChart`, route `traffic.tsx`, nav via `adminCatalog` (`traffic`)
- Architecture: [session-events.md](../architecture/session-events.md)
