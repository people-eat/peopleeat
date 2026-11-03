# Admin map

Operators inspect cooks, booking-request venues, cities, and partners on a single ops map under `/admin/map`.

## Behavior

1. Admins open `/admin/map` (Insights nav **Karte** / **Map**).
2. Floating controls toggle layers and set the booking-request date range (default last 90 days, max 366 via `DateTimeRange`).
3. **Layers**
   - **Cooks** — travel-origin pins, colored by map status (`LISTABLE` / `PENDING` / `HIDDEN`). Clustered. Hover or select draws that cook’s
     travel-radius circle when `maximumTravelDistance` is set (unlimited = no circle). Missing-origin cooks are counted off-map, not
     plotted.
   - **Booking requests** — event-venue pins for requests **created** in the selected range. Clustered. Layer off skips the booking GraphQL
     field.
   - **Cities** — center pins (published vs draft styling). Not clustered.
   - **Partners** — pins when `locationAddress` is set. Missing-location count off-map.
4. **Selection** — click a pin to open a side panel with summary + deep-link to the admin detail. Selecting a booking or city loads
   offer-capable cooks covering that point (`Admin.cooksInTravelRadius`) and overlays up to 25 travel-radius circles.
5. URL search mirrors filters: `from`, `to`, optional `layers` (comma list), optional `focus` (`cook|booking|city|partner:<id>`).

## Decisions

### Alternatives considered

| Option                       | Notes                                                                   |
| ---------------------------- | ----------------------------------------------------------------------- |
| Reuse full `AdminCook` lists | Too heavy for map paint; rejected                                       |
| Commercial map SDKs          | Extra tokens/billing; Places already Google; rejected for v1 tiles      |
| Leaflet                      | Viable; MapLibre chosen for native clustering + GL path                 |
| Server vector tiles / bbox   | Premature until slim GeoJSON is multi-MB; client cluster enough for now |

### Chosen

Slim `Admin.map` DTOs + MapLibre GL with OpenFreeMap Positron (no API key) + built-in GeoJSON clustering. Travel circles only for
hover/selection/coverage (cap 25). Booking load always date-bounded.

## Next steps

1. **Medium — Viewport / bbox fetch** if cook + booking points grow multi-MB.
2. **Low — Heatmap** of booking density (clusters carry density for v1).
3. **Low — Status filter chips** for booking lifecycle on the map chrome.

## Implementation

- SDL: `AdminMap`, `AdminMapCookPoint`, `AdminMapBookingRequestPoint`, `AdminMapCityPoint`, `AdminMapPartnerPoint`, `AdminMapCookStatus`,
  `Admin.map`
- Queries: `adminMapCookPointsFindMany`, `adminMapCooksMissingOriginCount`, `adminMapBookingRequestPointsFindMany`,
  `adminMapCityPointsFindMany`, `adminMapPartnerPointsFindMany`, `adminMapPartnersMissingLocationCount`; status helper
  `adminMapCookStatusDerive`
- Selection coverage reuses `adminCooksInTravelRadiusPreviewFindMany` via `Admin.cooksInTravelRadius`
- UI: `AdminMapPage`, `AdminMapCanvas`, `AdminMapSelectionPanel`, `adminMapSearch.ts`, `adminMapGeo.ts`; route `map.tsx`; dependency
  `maplibre-gl`
- Docs: this file; Insights note in [admin-shell.md](./admin-shell.md)
