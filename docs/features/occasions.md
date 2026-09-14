# Occasions

Admins publish bilingual occasion landing pages (birthday, wedding, company event, …) with optional promo spotlight and curated featured
cooks.

## Behavior

Public visitors open `/occasions` and `/occasions/$pathName`. Drafts stay unpublished until an admin sets a publish time.

After the hero, the page may show:

1. **Chef for any occasion** — bilingual headline and body, optional image, and a CTA card (booking form, WhatsApp, Google). The card is
   titled with the occasion name. When a global promo is assigned and still valid, the card shows a gift banner with redeem code and amount.
   Expired or booking-scoped codes show no banner.
2. **Formats** — bilingual title and subtitle plus exactly three format cards (image, title, body, three structured detail facts shown
   pipe-separated). Empty content hides the section on the public page; admin preview keeps the slot with placeholders.
3. **Featured cooks** from a curated assignment. Empty assignment hides the section (occasions are not geo pages, so there is no
   travel-radius fallback).

Assigned cooks who fail the public listing gate drop off the public page but stay in admin, with the same warnings as the partner editor.

Curated **testimonials** follow the same pattern as cities and partners, see [testimonials.md](./testimonials.md).

Occasion CTAs link to the booking request form without encoding the occasion in the URL. Promo on the card is display-only; redeem codes are
not passed as query params today.

**No How it works / Known from section.** Occasion detail pages deliberately stop at hero, first-section CTA, formats, cooks, testimonials,
and the free-form content sections. Partner pages do not ship those bands today either, but partners list them as a next step
([partners.md](./partners.md)); occasions do not. Keep occasion pages without them unless the product decision changes.

## Decisions

### Alternatives considered

| Approach                                    | Pros                              | Cons                                   |
| ------------------------------------------- | --------------------------------- | -------------------------------------- |
| Reuse `Partners` rows with a `kind` column  | One table, one editor             | Mixes two audiences in one admin list  |
| Free-form content sections only (no CTA)    | Least code                        | Loses the occasion CTA card and promo  |
| Dedicated `Occasions` entity mirroring them | Separate admin list and SEO scope | Duplicates the partner CQRS file shape |

### Chosen

A dedicated `Occasions` entity that mirrors the partner shape for the shared content-section stack, display name, Chef CTA first-section
slot, curated cooks and testimonials, and optional promo link — plus an occasion-only typed jsonb `formatsSection` (three format cards)
below the CTA. Occasion-specific: formats chrome, no geo fallback, and no How it works / Known from chrome.

## Next steps

- **Occasion deep-link on the booking form** — CTAs could open the form with the occasion preselected. Not implemented; the form takes no
  `occasionId` query parameter today.

## Ideas

- **Cross-links between occasions and cities** — an occasion page could list the cities where the occasion is bookable, and vice versa.
- **Structured data** — `Event`-flavored JSON-LD is a candidate once occasion pages carry dates or price ranges.

## Implementation

- Tables: `Occasions`, `OccasionCooks`, `OccasionTestimonials` (same columns and indexes as the partner trio, keyed by `occasionId`, plus
  occasion-only `formatsSection`)
- Occasion columns: shared `contentPageColumns`, `name`, first-section bilingual copy and image, typed jsonb `formatsSection` (Zod in
  [`src/shared/occasionFormatsSection.ts`](../../src/shared/occasionFormatsSection.ts); title/subtitle + exactly three cards with image,
  bilingual title/body, and three bilingual fact fields), optional `promoCodeId` (FK; rejects missing and booking-request-scoped codes via
  `resolveAssignedPromoCodeId`)
- GraphQL: `AdminOccasion`, `PublicOccasion`, `OccasionFormatsSection` / `OccasionFormatsCard` (+ inputs), `OccasionPromo`,
  `AdminOccasionCook`, `OccasionTestimonial`, `AdminOccasionTestimonial`, `OccasionUpsert`, `Query.publicOccasion` (`PublicOccasionQuery`),
  `Admin.occasions` / `Admin.occasion`, mutations `occasionUpsert`, `occasionDelete`, `occasionCooksUpdate`, `occasionTestimonialsUpdate`,
  and `WebPageKey.OCCASIONS`
- Commands: `adminOccasionUpsert`, `adminOccasionDelete`, `adminOccasionCooksUpdate`, `adminOccasionTestimonialsUpdate`
- Queries: `adminOccasionFindMany` / `FindOne`, `adminOccasionCooksFindMany`, `adminOccasionTestimonialsFindMany`,
  `occasionFeaturedCooksFindMany`, `occasionPromoFindOne`, `occasionTestimonialsFindMany`, `publicOccasionFindMany`,
  `publicOccasionFindOneByPathName`
- Mapper: `toGqlAdminOccasion` / `toGqlPublicOccasion` in `src/server/mappers/toGqlOccasion.ts`
- Shared read helpers: `occasionFindByPathNameAny` and `publicPublishedOccasionsFindMany` in `src/server/utils/contentPageFind.ts`
- Admin editor order: SEO → occasion name → hero → first section → promo → formats → cooks → testimonials → configurable sections
- Admin: `/admin/occasions` (shared admin list cards: name, path, draft/published badge, updated; debounced client search),
  `/admin/occasions/$occasionId` (cook search inside the choose-chefs dialog; cook and testimonial saves do not reset unsaved page form
  fields)
- Public: `/occasions` list and `/occasions/$pathName` detail; sitemap `/sitemap-occasions.xml` (linked from the `/sitemap.xml` index and
  `/llms.txt`)
- Draft flag: unified `publishedAt` (null = draft); `previousPathNames` drives 301 redirects on rename
- `SectionChefForAnyOccasion` / `SectionChefCta` take a neutral `displayName` prop so partner and occasion pages share one component;
  `SectionOccasionFormats` renders the formats slot (public hides when empty; admin preview force-shows placeholders)
- Tests: `adminOccasionUpsert`, `adminOccasionDelete`, `adminOccasionCooksUpdate`, `adminOccasionFindMany` (with `FindOne`),
  `publicOccasionFindMany` (with `FindOneByPathName`), `occasionPromoFindOne`; e2e `e2e/content-occasion-publish.spec.ts`

See [content-sections.md](../architecture/content-sections.md).
