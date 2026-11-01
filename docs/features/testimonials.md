# Testimonials

After a completed, paid event, customers and cooks leave star ratings and text; admins moderate low scores and curate quotes on marketing
pages.

## Behavior

### Customer

On a dual-accepted, paid offer whose event datetime is in the past, the customer submits rating, text, and optional event photos on the
offer **Review** tab (TanStack Form with under-field validation; primary Submit sits in the pinned profile action bar). Ratings 4–5 publish
immediately; 1–3 wait for admin approval. After submit, the thank-you view reuses the public `PageTestimonialCardFace` / detail dialog, and
the customer can body-edit for spelling. The UI also suggests posting the same text on Google reviews.

When a review is still owed:

- Opening the offer without an explicit tab defaults to Review (Offer keeps a clean URL; Chat uses `?tab=chat`).
- Review tab shows a red inline `NotificationBadge` (count `1`) while missing.
- Booking list and offer cards show a warning `StatusBadge` (“Review” / “Bewertung”) in the status row and morph the primary CTA to “Leave a
  review” / “Bewertung abgeben” when Review is the winning deep-link (call schedule links can still win navigation; the badge still shows).
- Reminder emails deep-link to Review (session sign-in, no magic tokens).

### Cook

Same completion gate. Cooks rate the experience (text and photos optional). Ratings below 5 unlock a short structured follow-up; submission
requires those fields. Same publish rules for low stars. Same form patterns as the customer (TanStack Form, pinned Submit, public-face
preview, body-only self-edit). Default tab and red `NotificationBadge` match the customer when a review is owed (no list-card pill on the
cook booking list).

### Admin

- Combined customer and cook list with filters as a card grid matching the public testimonial face (stars, clamped quote, photo strip,
  author). Cards navigate to detail; no publish/delete on the list. Shared `AdminTestimonialListCard` also powers the user page and admin
  chat `admin.testimonialList`. Cards and detail show **public page placements** (curated city / partner / occasion, plus chef profile for
  published offer-linked customer reviews).
- Detail editors for content, images, publish/unpublish/delete (AlertDialog confirms, not browser `confirm`). Star input, not numeric
  dropdowns. **Public view** opens the same detail dialog customers see. Placement links open the matching admin city / partner / occasion /
  user editor.
- Offer detail **Review** tab when completed or either side already has a testimonial — create, edit, publish, delete per side (separate
  from the Offer tab); publish/unpublish/delete use AlertDialogs.
- City, partner, and occasion editors: ordered picker across customer and cook testimonials; shared `AdminPageTestimonial.isPubliclyListed`
  (like `AdminFeaturedCook.isPubliclyListed`) flags curated rows that are not yet public. Admin live preview keeps those rows visible with a
  card `StatusBadge` and section `StatusAlert` (public pages still omit them).

### Public

- Chef profile: hero star row and testimonials section from published customer reviews (section hidden when empty); cook’s own public
  preview omits both (no live public fetch there).
- City and partner pages: curated testimonial section after featured cooks; hidden when empty. Each tile (`PageTestimonialCard`) is fully
  clickable (hover wash + underline on “Bewertung ansehen” / “View review”) and shows the occasion as the card title (stars + numeric rating
  top-right), a 4-line clamped quote with the accent quote-line, a 4-column square photo strip (4th slot becomes “+N more” when there are
  more than four), and author with written date only (city hidden on the tile). The detail dialog opens from the card, the view link, or a
  photo thumb. With photos: gallery (selected image, arrows, thumbnails) on the left and copy on the right at wider dialog widths; on
  desktop each column scrolls independently so the gallery stays visible while the copy scrolls. Detail copy leads with “{name}'s experience
  at {occasion}”, then rating and quote, then author below the body (same footing as the card) with one meta line “{date} in {city}”. On
  content pages (`showBookingCta`), the booking ask (“Also looking for a … experience?”) sits above the primary CTA into
  `/booking-request/form` with `occasion` prefilled (free, no obligation, centered under the button), replacing a divider line. Booking
  request plan keeps testimonials proof-only (no CTA). Default grid is 3 columns; plan uses 2 beside the sticky sidebar. Attachment
  downloads need a published `imageUrls` hit (public) or any testimonial hit for admins — see
  [file-storage.md](../architecture/file-storage.md).
- Home: static marketing quotes in a marquee — [landing.md](./landing.md).
- How to become a chef: static chef quotes (not database-driven).

## Ideas

- From the public detail dialog, link to the cook’s public chef profile when that cook is publicly listed (offer-linked customer review →
  chef page). Skip the link when the cook is not public so the dialog never dead-ends on a private profile.

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
- GraphQL: public and admin types, offer fields, city/partner curation, user/cook create + body-only update mutations
- Commands / queries: `*Testimonial*` under commands and queries (incl. `userBookingRequestOfferTestimonialUpdate` /
  `cookBookingRequestOfferTestimonialUpdate`); admin assistant list tool `adminTestimonialsFindMany` (customer + cook, in-process filters) →
  `admin.testimonialList` cards
- Utils: publication from rating, offer fallbacks, image URLs from file uploads, junction cleanup
- Public UI: `SectionCookHero` / `SectionCookTestimonials`, `SectionPageTestimonials` + `PageTestimonialCard` / `PageTestimonialCardFace` /
  `PageTestimonialDetailDialog` (photo strip, split detail dialog with author avatar; content pages pass `showBookingCta` for occasion
  question + form CTA; mobile always 1 column, `columns={2|3}` from `@md`), `ContentPageTestimonialsEditor`
- Admin UI: `AdminTestimonialsPage` card grid via `AdminTestimonialListCard`; detail pages + offer Review tab AlertDialog confirms; detail
  **Public view** reuses `PageTestimonialDetailDialog`; `publicPagePlacements` via `adminTestimonialPublicPagePlacementsLoad` /
  `AdminTestimonialPublicPagePlacements*`
- GraphQL: public `CustomerTestimonial` / `CookTestimonial.authorProfilePicture` (batch-loaded from the author’s current profile picture)
- Download auth: `fileUploadReferencedByPublishedTestimonial` / `fileUploadReferencedByAnyTestimonial` on `GET /api/file-uploads/:id`
- Capture UI: `BookingRequestOfferTestimonialPanel` (TanStack Form, accent stars, 4-col photo strip, inline validation, optional
  `imageFileUploadIds`; post-submit reuses `PageTestimonialCardFace` + `PageTestimonialDetailDialog`; body self-edit with pinned
  Save/Cancel) — Review tab on customer and cook offer pages; compose Submit via `BOOKING_REQUEST_OFFER_TESTIMONIAL_FORM_ID`, edit via
  `BOOKING_REQUEST_OFFER_TESTIMONIAL_EDIT_FORM_ID` in `ProfilePinnedFooterLayout`. Outstanding Review tab uses inline `NotificationBadge`.
  Admin offer Review tab stays separate.
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
