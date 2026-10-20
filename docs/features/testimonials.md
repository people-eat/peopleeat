# Testimonials

After a completed, paid event, customers and cooks leave star ratings and text; admins moderate low scores and curate quotes on marketing
pages.

## Behavior

### Customer

On a dual-accepted, paid offer whose event datetime is in the past, the customer submits rating and text on the offer **Review** tab.
Ratings 4–5 publish immediately; 1–3 wait for admin approval. After submit, the UI suggests posting the same text on Google reviews.

When a review is still owed:

- Opening the offer without an explicit tab defaults to Review (Offer keeps a clean URL; Chat uses `?tab=chat`).
- Review tab shows a badge while missing.
- Booking list and offer cards show a warning `StatusBadge` (“Review” / “Bewertung”) in the status row and morph the primary CTA to “Leave a
  review” / “Bewertung abgeben” when Review is the winning deep-link (call schedule links can still win navigation; the badge still shows).
- Reminder emails deep-link to Review (session sign-in, no magic tokens).

### Cook

Same completion gate. Cooks rate the experience (text optional). Ratings below 5 unlock a short structured follow-up; submission requires
those fields. Same publish rules for low stars. Default tab and badge match the customer when a review is owed (no list-card pill on the
cook booking list).

### Admin

- Combined customer and cook list with filters; detail editors for content, images, publish. Star input, not numeric dropdowns.
- Offer detail **Review** tab when completed or either side already has a testimonial — create, edit, publish, delete per side (separate
  from the Offer tab).
- City and partner editors: ordered picker across customer and cook testimonials; flags pending items not shown publicly yet.

### Public

- Chef profile: hero star row and testimonials section from published customer reviews (section hidden when empty); cook’s own public
  preview omits both (no live public fetch there).
- City and partner pages: curated testimonial section after featured cooks; hidden when empty.
- Home: static marketing quotes in a marquee — [landing.md](./landing.md).
- How to become a chef: static chef quotes (not database-driven).

## Decisions

### Alternatives considered

| Approach                             | Pros                          | Cons                    |
| ------------------------------------ | ----------------------------- | ----------------------- |
| Full dual-sided model with junctions | Complete marketplace feedback | Larger surface          |
| Customer-only reviews                | Smaller                       | Loses cook feedback     |
| Content-section quotes only          | Simple                        | No offer link / ratings |

### Chosen

Dual customer and cook testimonials linked to completed offers, admin moderation for low stars, and curated picks on city, partner, and chef
surfaces.

## Implementation

Structural decisions: [architecture/testimonials.md](../architecture/testimonials.md).

- Tables: `CustomerTestimonials`, `CookTestimonials`, `CityTestimonials`, `PartnerTestimonials`
- Domain: `src/server/domain/testimonial.ts`
- GraphQL: public and admin types, offer fields, city/partner curation, user/cook create mutations
- Commands / queries: `*Testimonial*` under commands and queries; admin assistant list tool `adminTestimonialsFindMany` (customer + cook,
  in-process filters) → `admin.testimonialList` cards
- Utils: publication from rating, offer fallbacks, image URLs from file uploads, junction cleanup
- Public UI: `SectionCookHero` / `SectionCookTestimonials`, `SectionPageTestimonials`, `ContentPageTestimonialsEditor`
- Capture UI: `BookingRequestOfferTestimonialPanel`, rating input/stars — Review tab on customer, cook, and admin offer pages
- List nudges: customer cards read `testimonialMissing`, deep-link `?tab=testimonial`
- Jobs: `bookingRequestOfferTestimonialReminder` (memory nudge, morning and evening reminders Europe/Berlin); schedule on payment success
  and datetime changes; cancel on request cancel
- Email templates and outbound purposes for each nudge kind — [jobs.md](../architecture/jobs.md#testimonial-reminders),
  [outbound-email.md](../architecture/outbound-email.md)

| Job kind | When (Europe/Berlin) | Purpose                       |
| -------- | -------------------- | ----------------------------- |
| Memory   | Event start + 1 hour | Mid-event photo nudge         |
| Morning  | Day after 09:00      | Ask for review                |
| Evening  | Day after 19:00      | Second nudge if still missing |

Handler skips canceled, unpaid, or not dual-accepted offers and skips parties who already submitted so one side finishing does not block the
other’s reminders.
