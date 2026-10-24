# Cities

Admins publish bilingual city landing pages for local SEO; each page highlights chefs who serve that area.

## Behavior

Admins create city pages with German and English names, URL slug, and a **mandatory map center** (latitude and longitude from place search).

Public visitors browse `/cities` and `/cities/$pathName` (and English paths). Unpublished pages are hidden; slug changes redirect
permanently to the current slug.

Public city detail section order:

1. **Hero** — bilingual headline/subheadline. Missing hero upload uses the stock fine-dining fallback image.
2. **Chef for any occasion** — bilingual first-section headline and body, optional image (stock chef-preparing fallback when unset), and the
   shared CTA card (booking form, WhatsApp, Google). No promo banner on cities.
3. **Featured cooks** — when admins assign cooks, those appear in saved order (must pass public listing rules). When the assignment is
   empty, cooks whose travel radius covers the city center are shown automatically.
4. **Testimonials** — curated and ordered; empty selection hides the block — [testimonials.md](./testimonials.md).
5. **How it works** — same chrome as the landing page.
6. **Dynamic content sections** — free-form shared section stack.
7. **Cities list** — published cities (same as landing `SectionCities`).
8. **Known from** — press logos (same as landing).

Assigned cooks who later become unlisted (hidden, unapproved, banned, or no published meal with an image) drop off the public page but
remain in the admin assignment. Banned cooks get a **banned-specific** warning in the featured-cook editor; other unlisted reasons keep the
generic warning.

## Decisions

### Alternatives considered

| Approach                                       | Pros                  | Cons                       |
| ---------------------------------------------- | --------------------- | -------------------------- |
| Shared section model with cities/partners/blog | One editor + renderer | Careful bilingual defaults |
| City-only section fork                         | Independent evolution | Duplication                |

### Chosen

Shared content-section stack — [content-sections.md](../architecture/content-sections.md). City-specific: bilingual names, map center,
curated cook list with geo fallback when empty, fixed first-section CTA slot, and landing chrome (How it works / cities / Known from) with
stock hero and CTA image fallbacks.

## Next steps

- Visit or analytics tracking.

## Implementation

- Tables / GraphQL / CQRS: `Cities`, `CityCooks`, admin list and upsert, `publicCity` → `PublicCity`, `cityTestimonialsUpdate`
- City columns: first-section bilingual copy and optional image (FK to `FileUploads`)
- Static fallbacks: `public/city/find-a-chef-in-city-section/fine-dining.webp`, `public/city/cta/chef-preparing.webp` via
  `src/web/pages/cityPageAssets.ts`
- Admin: `/admin/cities` (shared admin list cards; debounced client search; create requires map center), `/admin/cities/$cityId` (center,
  first section, cook assignment with listing warnings)
- Admin editor order: SEO → city name/center → hero → first section → cooks → testimonials → configurable sections
- Public: list + detail via `ContentPageView` (hero fallback, ChefForAnyOccasion, featured cooks, testimonials, HowItWorks, sections,
  SectionCities, KnownFrom)
- Landing: `HomePage` → `SectionCities` via `publicCity.findMany`
- Sitemap: `/sitemap-cities.xml`
- Geo fallback: `PublicCookFindManyCriterion.geoCoordinates` at city center — see [public-chefs.md](./public-chefs.md)
