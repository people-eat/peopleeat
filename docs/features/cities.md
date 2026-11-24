# Cities

Admins publish bilingual city landing pages for local SEO; each page highlights chefs who serve that area.

## Behavior

Admins create city pages with German and English names, a **country** (`DE` / `NL` / `CH`), URL slug, and a **mandatory map center**
(latitude and longitude from place search). Country is a taxonomy field on the city, not a separate Countries CMS.

Public visitors browse `/cities` and `/cities/$pathName` (and English paths). City URLs stay flat (`/cities/amsterdam`, never
`/netherlands/amsterdam`). Unpublished pages are hidden; slug changes redirect permanently to the current slug. `/cities` lists every
published city **grouped by country** (same HTML for every visitor and crawler; no IP or `Accept-Language` filtering). Detail shows a back
link above the headline (Germany → “All cities”; NL/CH → the country hub). The route emits city entity JSON-LD (headline/title as name,
place name, ISO `addressCountry`, stored map center as `areaServed`) and a breadcrumb trail (Germany: Home → Cities → City; NL/CH: Home →
country hub → City). When curated testimonials with ratings are visible, the entity is `Product` with required `aggregateRating` (Google
Product rich results need offers, review, or aggregateRating). Without rated testimonials it stays `Service` so Search Console does not flag
an invalid Product. A public chef links here when their travel-origin city matches this page’s German name, English name, or path.

Public city detail section order:

1. **Hero** — bilingual headline/subheadline. Missing hero upload uses the stock fine-dining fallback image.
2. **Chef for any occasion** — bilingual first-section headline and body, optional image (stock chef-preparing fallback when unset), and the
   shared CTA card (booking form, WhatsApp, Google). No promo banner on cities.
3. **Featured cooks** — when admins assign cooks, those appear in saved order (must pass public listing rules). When the assignment is
   empty, cooks whose travel radius covers the city center are shown automatically.
4. **Testimonials** — curated and ordered; empty selection hides the block — [testimonials.md](./testimonials.md).
5. **How it works** — same chrome as the landing page.
6. **Dynamic content sections** — free-form shared section stack.
7. **Cities list** — published siblings in the **same country**, plus a link to that country’s hub (catalog for DE; coming-to for NL/CH
   until guest launch). Coming-to / founding-chef hubs list `Cities` rows for that `countryCode` (including unpublished drafts).
8. **Known from** — press logos (same as landing).

The landing `SectionCities` shows the German grid and always-visible NL/CH hub links under “More countries”. It does not dump every market
into one unlabeled list.

Assigned cooks who later become unlisted (hidden, unapproved, banned, or no published meal with an image) drop off the public page but
remain in the admin assignment. Banned cooks get a **banned-specific** warning in the featured-cook editor; other unlisted reasons keep the
generic warning.

NL/CH city rows may be drafted as unpublished before guest launch. Do **not** publish them while booking for those addresses is closed — see
[market-expansion.md](./market-expansion.md).

## Decisions

### Alternatives considered

| Approach                                     | Pros                  | Cons                                                       |
| -------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| Shared section model with cities/venues/blog | One editor + renderer | Careful bilingual defaults                                 |
| City-only section fork                       | Independent evolution | Duplication                                                |
| Countries CMS parent for city pages          | Editable country hubs | Duplicates expansion config; wrong layer for three markets |
| Nest city URLs under `/netherlands/…`        | Country in path       | Breaks flat `/cities/{slug}` SEO and redirects             |
| Geo-IP / Accept-Language city list           | Local-looking home    | Cloaking risk; crawlers see DE; locale ≠ market            |

### Chosen

Shared content-section stack — [content-sections.md](../architecture/content-sections.md). City-specific: bilingual names, `countryCode`
taxonomy (`DE` / `NL` / `CH`), map center, curated cook list with geo fallback when empty, fixed first-section CTA slot, and landing chrome
(How it works / same-country cities / Known from) with stock hero and CTA image fallbacks. Country-intent SEO stays on coming-to / future
short country hubs, not a `/countries` index.

## Next steps

- Visit or analytics tracking.
- At guest launch: publish NL/CH city pages with unique copy; 301 coming-to → `/netherlands` / `/switzerland`; lift booking market closed.

## Implementation

- Tables / GraphQL / CQRS: `Cities`, `CityCooks`, admin list and upsert, `publicCity` → `PublicCity`, `cityTestimonialsUpdate`
- City columns: `countryCode` (`CityCountryCode` enum / shared helpers in `src/shared/cityCountryCode.ts`), first-section bilingual copy and
  optional image (FK to `FileUploads`)
- Static fallbacks: `public/city/find-a-chef-in-city-section/fine-dining.webp`, `public/city/cta/chef-preparing.webp` via
  `src/web/pages/cityPageAssets.ts`
- Admin: `/admin/cities` (shared admin list cards; country badge; debounced client search in URL `q`; country filter via URL `country`;
  client sort via URL `sort` (`name-asc` default, `name-desc`, `created-desc` / `created-asc`, `updated-desc` / `updated-asc`); create
  requires country + map center), `/admin/cities/$cityId` (country select, center, first section, cook assignment with listing warnings)
- Admin editor order: SEO → city name/country/center → hero → first section → cooks → testimonials → configurable sections
- Public: list grouped by country + detail via `ContentPageView` (hero fallback, ChefForAnyOccasion, featured cooks, testimonials,
  HowItWorks, sections, same-country `SectionCities`, KnownFrom)
- Landing: `HomePage` → `SectionCities` (DE cities + expansion hub links) via `publicCity.findMany`
- Expansion hubs: `ComingToCountryPage` / `FoundingChefCountryPage` → `publicCity.findMany(countryCode:)` (NL/CH include drafts)
- Sitemap: `/sitemap-cities.xml`
- JSON-LD: `jsonLdCityProduct` when curated ratings exist (`Product` + required `aggregateRating`); otherwise `jsonLdCityService`
  (`areaServed` Place includes `address.addressCountry`)
- Geo fallback: `PublicCookFindManyCriterion.geoCoordinates` at city center — see [public-chefs.md](./public-chefs.md)
