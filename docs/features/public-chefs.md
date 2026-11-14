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

**Detail** (`/chefs/$pathName`)

Shared profile layout (`ChefProfileView`, container-query driven):

- **Hero** — top bar with back to all chefs (left) and **Share** (right; secondary button; native share sheet when available, else copy
  link; gated by `COOK_PUBLIC_PROFILE_SHARE`). Large photo, name, city, cuisine and philosophy pills (`CookProfileTags`, md size), summary,
  star rating when there is at least one published review (hidden otherwise; cook self-preview can still show “no reviews yet”), primary CTA
  to the booking form with non-binding copy underneath. When `BOOKING_REQUEST_COOK_DIRECT` is on and the cook is offer-ready
  (`PublicCook.canReceiveDirectRequests`), the CTA names the chef and passes `?cookId=` so create stays exclusive; otherwise it stays the
  generic marketplace form. Successful share/copy tracks discovery `click` / `share` (same `chefs` area as `book_cta`, which includes
  `cookId`, and `menuId` when the CTA is a published menu). Share is wired only on the public detail page — cook WYSIWYG preview omits Share
  but follows the same CTA rule. Stacks until ~48rem (`@3xl`); photo grows stepwise in the row (`@3xl` / `@4xl` / `@5xl`) so resize never
  crushes copy beside a full-width square.
- **Menus** — published, complete inventory menus with at least one meal-option image (`PublicCook.menus`) after the hero. Cards use the
  same collage as cook menu cards; click opens `PublicCookMenuDialog` (courses and dishes). When the chef-page request toggle is on and the
  cook is offer-ready, the dialog has **Request this menu** → `/booking-request/form?cookId=&menuId=`. Hidden when none qualify. Shows the
  first 5 menus; Show more / Show less when there are more. Grid 2 → 3 (`@md`) → 4 (`@2xl`) → 5 (`@5xl`).
- **Meals** — published dishes **with an image** as marketing meal tiles (`CustomerMealCard` `variant="marketing"`: square image on top,
  title, up to two lines of description); published meals without an image are omitted. Click opens the shared meal details dialog. Shows
  the first 5 meals; when there are more, a bilingual Show more / Show less control sits top-right on the section title row. Grid 2 → 3
  (`@md`) → 4 (`@2xl`) → 5 (`@5xl`).
- **About** — full biography plus cook additional picture when uploaded, otherwise the bilingual peopleeat benefits list (taste / relaxed /
  secure booking); two columns from `@3xl`. Hidden when the cook has no biography.
- **Testimonials** — published customer reviews as the shared public review card; hidden when none — [testimonials.md](./testimonials.md).
  Grid 1 → 2 (`@2xl`) → 3 (`@5xl`).
- **FAQ** — shared public booking FAQ. The same entries are emitted as `FAQPage` JSON-LD.

The document title is “{name}, Privatkoch in {city}” (English: “private chef in {city}”), kept to 60 characters before the peopleeat suffix.
The meta description uses the biography summary when it is at least 50 characters, otherwise a short factual sentence with cuisine when that
is set. When the travel-origin city matches exactly one published city page (German name, English name, or path, compared as slugs), the pin
links to that page and both the title and the pin use the page’s localized name. No match, or two matches, leaves the city as plain text.
Cook self-preview does not resolve the city page, so its pin stays plain text. The route also emits `Person` and `BreadcrumbList` JSON-LD.
`Person` does not include `aggregateRating` or `Review`: Google review snippets do not support that parent type, and Search Console reports
it as invalid object type for `<parent_node>`. Visible star ratings on the hero and cards are unchanged.

Section padding matches other public bands (`px-4` → `@lg:px-6`).

Missing or non-public cooks return not found. Detail does not require a catalog-eligible meal (direct links still work). Cooks preview the
same layout under profile public preview (preview meal and menu lists also omit unpublished / incomplete / no-picture items and surface
warning counts); live URL sharing is gated on visibility.

Canonical public URL is `/chefs/<pathName>` (and `/en/chefs/<pathName>`). The platform auto-assigns a slug from first name + last name
(German transliteration so Müller → mueller; collisions get `-2`, `-3`, …). Renaming archives the old slug. Requests to a previous slug or
the legacy `/chefs/<cookId>` 301 to the current path. Canonical identity stays `cookId`. Non-public cooks 404 even on old URLs (no redirect
to a private profile). Anonymize keeps the slug so it is not reused.

**Visibility**

Public listing requires cook visibility and admin approval and an active user account (not banned or anonymized). Street addresses and
payout fields never appear — only city from travel origin, falling back to import-preserved `legacyCityName` when the exact origin city is
empty.

**City, venue, and occasion pages**

Featured-cook grids reuse the same `PublicCookCard` via `SectionFeaturedCooks`. City pages use curated cooks or travel-radius fallback from
the city center — [cities.md](./cities.md). Venue pages use curated cooks only — [partners.md](./partners.md). Occasion pages do the same —
[occasions.md](./occasions.md).

## Decisions

### Alternatives considered

| Approach                              | Notes                                         |
| ------------------------------------- | --------------------------------------------- |
| Nested public cook namespace on query | Matches other public content namespaces       |
| Flat find-many on root query          | Works; rejected for consistency               |
| Slug URLs from day one                | Better SEO; deferred until pathName shipped   |
| Public menus on detail                | Shipped: published + complete + ≥1 meal image |

### Chosen

Public cook list by cook id internally; public detail by `pathName` with 301 from previous slugs and cook id. Lean public cook type with
nested published meals that have images and nested published complete menus that have a meal image. Search text and optional geo radius
filter (used on city pages, not on the global list). Menu CTAs still go through the booking-request wizard (not instant book).

## Next steps

None for public slug URLs. Cook self-serve slug editing stays behind `COOK_PUBLIC_PROFILE_PATH_NAME`.

## Implementation

- SDL: `PublicCook`, meals field, public cook query namespace, search and geo criterion types
- Queries: public find many/one, meal list, menu list (`publicCookMenuFindMany` + `publicCookMenuCatalogWhere` then completeness / image
  filter); shared visibility and “at least one published meal with image” gate for list and sitemap (`publicCookMealCatalogWhere`);
  list/sitemap order in `publicVisibleCookIdsFindMany` (picture → published review → cuisine/philosophy → first name)
- City: `toGqlPublicCook` uses `exactTravelOriginAddress.city`, then `legacyCityName`; chef `?q=` search matches both
- Geo: haversine travel radius via shared pure helper
- UI: `ChefsPage` (`SectionChefForAnyOccasion` + `?q=` + debounce + `PublicCookCard` grid), `ChefPage`, shared `ChefProfileView`
  (`@container`) / `SectionCookHero` / `SectionCookMenus` / `PublicCookMenuDialog` / meals / about / testimonials, `PublicCookCard` /
  `SectionFeaturedCooks` for list and content-page featured cooks, `CookProfileTags` on detail hero; About uses `PublicCook.logo` or
  `CookAboutBenefitsFallback`; detail multi-column layouts use `@2xl` / `@3xl` / `@5xl` (not early `@sm` / `@md`) so browser resize and
  profile public preview stay readable
- Share: `ShareButton` + `webShareOrCopy` / `publicChefUrl(pathName)` (`src/web/utils/webShare.ts`); gated by `COOK_PUBLIC_PROFILE_SHARE`;
  hero Share only from `ChefPage` (discovery `chefsDiscoveryShareKey`, secondary variant); cook Preview toolbar Share / Copy / Open when
  live
- Cook preview: `ProfileCookPublicPage` at `/profile/public` — Preview tab (default; Share / Copy / Open + static `PublicCookCard` + detail
  WYSIWYG) and Manage tab (`?tab=manage`; visibility + additional picture); both previews use `Cook.rating`; testimonials section still
  omitted on preview
- Routes: `chefs.tsx`, `chefs_.$pathName.tsx` (loader `findOneByPathName`, 301 when the segment is a previous slug or cookId, `chefPageSeo`
  title/description, `Person` + FAQ + breadcrumb JSON-LD), `profile/public.tsx`
- Path names: `Cooks.pathName` unique + `previousPathNames`; helpers `src/shared/cookPathName.ts` / `src/server/utils/cookPathName.ts`;
  GraphQL `pathName` on `PublicCook` / `Cook` / `AdminCook`, `findOneByPathName`, `Cook.pathNameAvailable` / `Admin.cookPathNameAvailable`;
  auto-assign on `userCreate` / `userCookCreate` / `adminUserCreate`; SQL backfill in `drizzle/0031_same_dorian_gray.sql`. Cook self-serve
  edit gated by `COOK_PUBLIC_PROFILE_PATH_NAME`; admin edit always on. Public hrefs (`PublicCookCard`, sitemap, `llms.txt`, JSON-LD) use
  `pathName`. Session visits resolve slug → stable `cookId`.
- City link: `PublicCook.cityPage`, matched in `publicCookCityPageMatch` from published city names
- Sitemap: `/sitemap-chefs.xml` in index

Hydration helpers for booking-offer nesting do not apply the public meal gate on nested cooks. `publicCooksByIdFindMany` loads cooks with
`INNER JOIN users LEFT JOIN FileUploads` (profile-picture **metadata only** — never `bytes`).

See [testimonials.md](./testimonials.md), [cities.md](./cities.md), [booking-request-create.md](./booking-request-create.md).
