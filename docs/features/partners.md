# Partners and venues

A **partner** is the company that owns one or more bookable venues. A **partner venue** is the public landing and address for one of those
venues. Admins manage companies; visitors only see venues.

## Behavior

Public visitors open `/venues` and `/venues/$pathName`. Drafts stay unpublished until an admin sets a publish time. `/partners` and
`/partners/$pathName` (including locale prefixes) 301 to the matching `/venues` URL. The partner company name is not shown on public pages.

Public venue detail section order:

1. **Hero** — bilingual headline/subheadline. Admins can turn off the dark image overlay when the photo already reads dark enough
   (`heroImageOverlay`, default on).
2. **Chef for any occasion** — bilingual headline and body, optional image, and a CTA card (primary button, WhatsApp, Google). The primary
   button defaults to the booking request form; admins may set an optional custom CTA URL (absolute `http(s)` or site-relative path). When a
   global promo is assigned and still valid, the card shows a gift banner with redeem code and amount. Expired or booking-scoped codes show
   no banner. Admins can turn off the CTA image gradient (`firstSectionImageOverlay`, default on).
3. **Featured cooks** from a curated assignment. Empty assignment hides the section (venues are not geo pages, no travel-radius fallback).
   Admins can hide travel-origin city on those cook cards (`featuredCooksShowCity`, default on) when the city is misleading for the venue.
4. **Testimonials** — curated and ordered; empty selection hides the block — [testimonials.md](./testimonials.md).
5. **How it works** — same chrome as the landing page, CTA hidden. Admins may enable alternative media (`howItWorksAlternativeMedia`) for
   venue-specific footage (step 1 video + step 3 still, DE headline tweak).
6. **Dynamic content sections** — free-form shared section stack.
7. **Venues explore** — CTA to `/venues` (“Weitere Locations” / “More venues”) so visitors can browse other venues. Hidden unless
   `VENUE_PAGE_VENUES_EXPLORE` is on (missing DB row = off; see [admin-feature-toggles.md](./admin-feature-toggles.md)). Admin venue preview
   keeps the section visible for ops.
8. **Known from** — press logos (same as landing).

Assigned cooks who fail the public listing gate drop off the public page but stay in admin. Banned cooks get a **banned-specific** warning
in the featured-cook editor; other unlisted reasons keep the generic warning.

By default the primary CTA and the sticky header booking button both link to the booking request form without encoding a full address in the
URL. An optional `firstSectionCtaUrl` overrides both (WhatsApp / Google stay fixed). Display-only promo on the card; redeem codes are not
passed as query params today unless the custom URL includes them.

Optional **location address** (`locationAddress`) on the venue prefills [`/booking-request/plan?venueId=…`](./booking-request-plan.md) and
is reusable outside booking. Flat URL venue params still override. Legacy `?partnerId=` on that funnel maps to `venueId`. Admins set the
address under Standort / Location in the venue editor.

### Admin

Nav stays **Partners**. `/admin/partners` groups venues under their company (name, path, published). Search matches partner name, venue
name, and path. **Neuer Partner** creates the company plus a first draft venue and opens the venue editor. Per partner: **Venue
hinzufügen**. Partner rename is inline. Partner delete is allowed only when the company has no venues.

The venue editor is `/admin/partner-venues/$partnerVenueId`. Partner select at the top moves the venue to another company. Standort stays
the venue address. Legacy `/admin/partners/$id` 301s to the venue editor (migrated venue ids match the old partner ids).

The ops map and cook “featured on” use venue pins and links; the partner company name is a subtitle in admin only.

## Decisions

### Alternatives considered

| Approach                                 | Pros                      | Cons                     |
| ---------------------------------------- | ------------------------- | ------------------------ |
| Same shared section stack as cities/blog | No venue-only editor fork | Venue-specific chrome    |
| Keep public pages named Partner          | Less rename work          | Language stayed wrong    |
| JSONB array of addresses on one landing  | One page per company      | Cannot market two venues |
| Public partner/company pages             | Company story             | Product is the venue     |
| One landing per company with a picker    | Fewer URLs                | Hides the bookable place |

### Chosen

Partner is identity only (`name`). PartnerVenue owns the content page, address, promo, cooks, testimonials, and CTA. Shared content-section
stack with venue-specific chrome: single display name, curated cooks (optional city-on-card toggle), fixed first-section slot, optional
promo link, image overlay toggles, How it works alternative media, and landing chrome (How it works / Known from).

Dedicated co-branded landings such as a former Amex route are **not** rebuilt. Venue pages (`/venues/$pathName`) are the product home for
campaigns and CTAs.

## Next steps

- Point venue CTAs at `/booking-request/plan?venueId=…` (and optional stay bounds / `firstName`) when the 2-step funnel is preferred over
  the multi-step form.
- Drop the legacy `?partnerId=` alias on the plan funnel once campaign links are rewritten.

## Ideas

**Become a partner — self-serve layout builder (planned)**

Some partners expect one-off page layouts; unbounded custom work does not scale. The product already limits pages to the shared section
stack — the gap is letting prospects compose within those limits before asking for exceptions.

Target behavior:

1. A **Become a partner** entry on `/venues` (list CTA and/or dedicated route).
2. A **layout builder** reusing the same blocks as the admin venue editor — hero, first-section CTA, featured cooks, typed content sections
   — with live preview of what is and is not possible (no free-form HTML or bespoke components).
3. **Submit for admin review**; admins publish or request changes on the existing venue admin surface; drafts stay unpublished until
   approved.

If it is not in the builder, it is not a supported page change.

| Approach                                | Trade-off                                              |
| --------------------------------------- | ------------------------------------------------------ |
| Email/sales builds every page           | Simple ops; custom-dev pressure continues              |
| FAQ of supported blocks only            | Cheap; partners still ask for exceptions               |
| Self-serve builder + admin publish gate | Shows real limits; reuses sections; needs review queue |

Direction: self-serve builder on the public venues surface, admins remain sole publishers.

## Implementation

- Tables: slim `Partners` (`partnerId`, `name`, timestamps); `PartnerVenues` (content page + `locationAddress` + promo/overlays/CTA;
  required `partnerId` restrict); junctions `PartnerVenueCooks`, `PartnerVenueTestimonials`
- GraphQL / CQRS: public `publicPartnerVenue` (`findOne(partnerVenueId)`, `findOneByPathName`, `findMany`) with no partner/company fields;
  admin `AdminPartner` (venues nested) + `AdminPartnerVenue`; mutations `partnerUpsert` / `partnerDelete` (rejects while venues exist),
  `partnerVenueUpsert` / `partnerVenueDelete` (`partnerId` required; changing it moves the venue), cooks/testimonials take `partnerVenueId`
- Enums: `WebPageKey.VENUES`, `VENUE_PAGE_VENUES_EXPLORE`, `AdminCookFeaturedLandingKind.PARTNER_VENUE`,
  `AdminTestimonialPublicPageKind.PARTNER_VENUE`
- Venue columns: first-section bilingual copy and image, optional `firstSectionCtaUrl` (http(s) or site-relative; empty clears to default
  booking form), optional `promoCodeId` (FK; rejects missing and booking-request-scoped codes), `heroImageOverlay` /
  `firstSectionImageOverlay` (default true), `howItWorksAlternativeMedia` (default false), `featuredCooksShowCity` (default true; gates city
  on featured `PublicCookCard`s), optional `locationAddress` (jsonb venue location; plan deep-links and later reuse)
- Public GraphQL: `publicPartnerVenue.findOne(partnerVenueId)` (published-only) alongside `findOneByPathName`
- Public/admin promo preview via `partnerVenuePromoFindOne` — null when unassigned, scoped, or expired
- UI: `SectionChefForAnyOccasion` + `SectionChefCta` after hero (always mounted when the venue slot is passed; empty headline/body and
  missing CTA image use muted italic / `ImageOffIcon` placeholders like content sections; `ctaUrl` / `firstSectionCtaUrl` overrides the
  primary button and `Header` booking CTA via `ContentPageView` → `bookingRequestCtaUrl`); admin cards for first section (incl. CTA link and
  overlay toggle), How it works alternative media, and promo select
- Admin editor order: SEO → partner select → venue name → hero (incl. overlay) → first section → promo → How it works → cook-card city
  toggle → cooks → testimonials → configurable sections
- Admin: `/admin/partners` (grouped by company; nested venue cards), `/admin/partner-venues/$partnerVenueId` (`AdminPartnerVenuePage`; cook
  search inside the choose-chefs dialog + listing warnings; cook/testimonial saves and in-flight image uploads mark the page dirty so the
  subscription does not reset unsaved form fields; hero/first-section image updates merge via functional setState so a completing upload
  cannot clobber newer edits)
- Public / admin preview: `VenuesPage` / `VenuePage` via `ContentPageView` (hero overlay, ChefForAnyOccasion, featured cooks, testimonials
  via `contentPageTestimonialsForPreview`, HowItWorks with `hideCta` / alternative media, sections, `SectionVenuesExplore` → `/venues`
  (gated by `VENUE_PAGE_VENUES_EXPLORE` on the public page; admin preview always shows it), KnownFrom); sitemap `/sitemap-venues.xml`;
  legacy `/sitemap-partners.xml` 301s
- Booking plan search: `venueId` with optional legacy `partnerId` alias
- Alternative HowItWorks assets: `public/home/how-it-works-section/*.alternative.*`
- Draft flag: unified `publishedAt` (null = draft)
- Separate admin vs public GraphQL shapes (same pattern as other content pages)

When the builder ships: reuse `ContentSectionsEditor` / `ContentPageView` patterns; persist drafts with `publishedAt = null`; admin list
filter for pending submissions; signed-in session and/or captcha on submit.

See [content-sections.md](../architecture/content-sections.md).
