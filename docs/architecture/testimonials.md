# Testimonials

## Context

After a completed booking, customers rate cooks and cooks leave platform/guest feedback. Public chef, city, partner, and occasion pages need
curated or offer-linked social proof. Admin must moderate low ratings before they go live.

## Decision

Four PascalCase tables:

| Table                  | Role                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| `CustomerTestimonials` | Customer → cook review; optional unique FK to `BookingRequestOffers` |
| `CookTestimonials`     | Cook feedback (optionally offer-linked); optional `lowRatingAnswers` |
| `CityTestimonials`     | Polymorphic ordered curation (`COOK` \| `CUSTOMER` + `index`)        |
| `PartnerTestimonials`  | Same junction for partners                                           |
| `OccasionTestimonials` | Same junction for occasions                                          |

Star ratings are integers **1–5** on every write path (`testimonialRatingAssertRequired`). `0`, null, and other out-of-range values are
rejected (admin create and offer self-service create/update always require a rating; admin update rejects clearing to null). Publication
gate: ratings `<= 3` → `PENDING_REVIEW`; otherwise auto-`PUBLISHED`. Admin-authored rows are always published. Images stay as `imageUrls`
JSON string arrays (absolute `/api/file-uploads/{id}` URLs for new uploads; migrated absolute URLs remain valid).

Public chef pages expose only **published customer** testimonials linked via offers, plus `PublicCookRating`. City, partner, and occasion
pages show admin-curated selections (published only) as shared `PageTestimonial`. Admin editors use shared `AdminPageTestimonial` with
`isPubliclyListed` (same gate: `publicationStatus = PUBLISHED`) so they can warn about curated rows that would not appear publicly —
parallel to `AdminFeaturedCook.isPubliclyListed`.

Post-event prompting uses pg-boss scheduled jobs + `OutboundEmails` (no magic review tokens — signed-in profile deep links with a
testimonial tab).

## Alternatives considered

| Option                          | Why not                                            |
| ------------------------------- | -------------------------------------------------- |
| Soft-delete / featured flags    | Hard delete + junction curation is enough          |
| Separate FileUploads join table | `imageUrls` JSON arrays keep public URLs simple    |
| Klaviyo / WhatsApp / Slack      | Not in this stack; use OutboundEmails + admin list |

## Consequences

- Delete commands must remove the city, partner, and occasion junction rows for the deleted testimonial (`testimonialJunctionRowsDelete`).
- Admin list/detail expose reverse `publicPagePlacements` (batch-loaded from junctions + published offer-linked customer → chef page) via
  `adminTestimonialPublicPagePlacementsLoad`.
- Display fallbacks load offer/booking context (author, **city only**, occasion, participants) — never street address.
- Home / how-to-become-a-chef marketing quotes stay static (not DB-driven).
- Testimonial `imageUrls` are `/api/file-uploads/{id}` paths. Download auth treats published testimonials as public references and any
  testimonial (including `PENDING_REVIEW`) as an admin reference — see [file-storage.md](./file-storage.md).
