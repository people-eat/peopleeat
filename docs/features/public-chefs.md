# Public chefs

Visitors discover admin-approved cooks with published meals that have images and open rich profile pages before sending a booking request.

## Behavior

**List** (`/chefs`)

- Top **Chef for any occasion** band (`SectionChefForAnyOccasion`) with bilingual marketing copy and booking CTA (same chrome as partner /
  occasion pages; no promo banner on the global list).
- Dense grid of shared `PublicCookCard` tiles (1 / 2 / 3 / 4 columns by breakpoint): square profile photo, name (`PublicCook.user.display` =
  non-empty `stageName` or first name), city (map pin), `CookProfileTags` (cuisine + philosophy pills), and compact star rating when there
  is at least one published review (same aggregate as the chef detail hero, smaller; omitted when none). Shared booking card hover / pressed
  / focus chrome (`bookingRequestCardInteractionClassName`). No biography summary on the card.
- Debounced search (`?q=`) across name, biography, cuisine, philosophy, and city.
- Sort: profile picture present, then published customer review present, then cuisine style or cooking philosophy present, then first name.
  Only cooks with at least one published meal that has an image appear.
- Page title and description from the managed chefs web-page SEO entry.

**Detail** (`/chefs/$cookId`)

Shared profile layout (`ChefProfileView`, container-query driven):

- **Hero** — large photo, name, city, cuisine and philosophy pills (`CookProfileTags`, md size), summary, star rating when there is at least
  one published review (hidden otherwise; cook self-preview can still show “no reviews yet”), primary CTA to the booking form with
  non-binding copy underneath. Stacks until ~48rem (`@3xl`); photo grows stepwise in the row (`@3xl` / `@4xl` / `@5xl`) so resize never
  crushes copy beside a full-width square.
- **Meals** — published dishes **with an image** as marketing meal tiles (`CustomerMealCard` `variant="marketing"`: square image on top,
  title, up to two lines of description); published meals without an image are omitted. Click opens the shared meal details dialog. Shows
  the first 5 meals; when there are more, a bilingual Show more / Show less control sits top-right on the section title row. Grid 2 → 3
  (`@md`) → 4 (`@2xl`) → 5 (`@5xl`).
- **About** — full biography plus cook additional picture when uploaded, otherwise the bilingual peopleeat benefits list (taste / relaxed /
  secure booking); two columns from `@3xl`. Hidden when the cook has no biography.
- **Testimonials** — published customer reviews; hidden when none — [testimonials.md](./testimonials.md). Grid 1 → 2 (`@2xl`) → 3 (`@5xl`).
- **FAQ** — shared public booking FAQ.

Section padding matches other public bands (`px-4` → `@lg:px-6`).

Missing or non-public cooks return not found. Detail does not require a catalog-eligible meal (direct links still work). Cooks preview the
same layout under profile public preview (preview meal list also omits published meals without images and surfaces a warning count); live
URL sharing is gated on visibility.

**Visibility**

Public listing requires cook visibility and admin approval and an active user account (not banned or anonymized). Street addresses and
payout fields never appear — only city from travel origin, falling back to imported `legacyCityName` when the exact origin city is empty.

**City, partner, and occasion pages**

Featured-cook grids reuse the same `PublicCookCard` via `SectionFeaturedCooks`. City pages use curated cooks or travel-radius fallback from
the city center — [cities.md](./cities.md). Partner pages use curated cooks only — [partners.md](./partners.md). Occasion pages do the same
— [occasions.md](./occasions.md).

## Decisions

### Alternatives considered

| Approach                              | Notes                                     |
| ------------------------------------- | ----------------------------------------- |
| Nested public cook namespace on query | Matches other public content namespaces   |
| Flat find-many on root query          | Works; rejected for consistency           |
| Slug URLs from day one                | Better SEO; deferred — no slug column yet |
| Public menus on detail                | Deferred; meals first                     |

### Chosen

Public cook list and detail by cook id for now. Lean public cook type with nested published meals that have images. Search text and optional
geo radius filter (used on city pages, not on the global list).

## Next steps

**Public slug URLs (SEO)**

Move detail URLs from opaque ids to a readable slug (first name + city, normalized), with cook-editable slug, permanent redirects from
former slugs, and optional redirect from id URLs. Canonical identity stays the internal cook id; implement when slug storage and edit UI
ship.

## Implementation

- SDL: `PublicCook`, meals field, public cook query namespace, search and geo criterion types
- Queries: public find many/one, meal list; shared visibility and “at least one published meal with image” gate for list and sitemap
  (`publicCookMealCatalogWhere`); list/sitemap order in `publicVisibleCookIdsFindMany` (picture → published review → cuisine/philosophy →
  first name)
- City: `toGqlPublicCook` uses `exactTravelOriginAddress.city`, then `legacyCityName`; chef `?q=` search matches both
- Geo: haversine travel radius via shared pure helper
- UI: `ChefsPage` (`SectionChefForAnyOccasion` + `?q=` + debounce + `PublicCookCard` grid), `ChefPage`, shared `ChefProfileView`
  (`@container`) / `SectionCookHero` / meals / about / testimonials, `PublicCookCard` / `SectionFeaturedCooks` for list and content-page
  featured cooks, `CookProfileTags` on detail hero; About uses `PublicCook.logo` or `CookAboutBenefitsFallback`; detail multi-column layouts
  use `@2xl` / `@3xl` / `@5xl` (not early `@sm` / `@md`) so browser resize and profile public preview stay readable
- Cook preview: `ProfileCookPublicPage` at `/profile/public` — Preview tab (default; share + static `PublicCookCard` + detail WYSIWYG) and
  Manage tab (`?tab=manage`; visibility + additional picture); both previews use `Cook.rating`; testimonials section still omitted on
  preview
- Routes: `chefs.tsx`, `chefs_.$cookId.tsx`, `profile/public.tsx`
- Sitemap: `/sitemap-chefs.xml` in index

Hydration helpers for booking-offer nesting do not apply the public meal gate on nested cooks.

See [testimonials.md](./testimonials.md), [cities.md](./cities.md), [booking-request-create.md](./booking-request-create.md).
