# Testimonials

After a completed, paid event, customers and cooks leave star ratings and text; admins moderate low scores and curate quotes on marketing
pages.

## Behavior

### Customer

On a dual-accepted, paid offer whose event datetime is in the past, the customer submits rating, text, and optional event photos on the
offer **Review** tab (TanStack Form with under-field validation; primary Submit sits in the pinned profile action bar). Star rating is
required and must be **1–5** (`0` is rejected on every GraphQL write path). Ratings 4–5 publish immediately; 1–3 wait for admin approval.
After submit, the thank-you view reuses the public `TestimonialCardFace` / detail dialog, and the customer can edit rating, text, and
photos. Dropping the rating to 1–3 re-applies admin review. The UI also suggests posting the same text on Google reviews.

When a review is still owed:

- Opening the offer without an explicit tab defaults to Review (Offer keeps a clean URL; Chat uses `?tab=chat`).
- Review tab shows a red inline `NotificationBadge` (count `1`) while missing.
- Booking list and offer cards reuse the same red corner `NotificationBadge` when a review is owed and there is no unread count (unread wins
  the corner when both apply). The primary CTA morphs to “Leave a review” / “Bewertung abgeben” when Review is the winning deep-link (call
  schedule links can still win navigation).
- Reminder emails deep-link to Review (session sign-in, no magic tokens).

### Cook

Same completion gate. Cooks rate the experience (text and photos optional). Rating is required and must be **1–5** (`0` rejected). Ratings
below 5 unlock a short structured follow-up; submission requires those fields. Same publish rules for low stars. Same form patterns as the
customer (TanStack Form, pinned Submit, public-face preview, full self-edit of rating / text / photos). Editing a rating below 5 keeps
existing follow-up answers unless the cook fills them again; dropping from 5 to below 5 requires the follow-up. Default tab and red
`NotificationBadge` match the customer when a review is owed (no list-card corner badge on the cook booking list).

### Admin

- Combined customer and cook list as a card grid matching the public testimonial face (stars, clamped quote, photo strip, author + long-form
  written date). Filters are labeled selects (author type, publication status, offer link) plus search, matching other admin list pages;
  breadcrumb covers the page title (no duplicate H1). Cards navigate to detail; no publish/delete on the list. Shared
  `AdminTestimonialListCard` also powers the user page and admin chat `admin.testimonialList`. Card header is one single-line badge row:
  author type (`Kunde` / `Koch`), publication as `StatusBadge` (green published / yellow pending), then truncated public-page placements
  (curated city / partner / occasion, plus chef profile for published offer-linked customer reviews) so neighboring cards keep occasion /
  stars aligned.
- Detail pages open **read-only** content styled like the public face (occasion title, accent stars + numeric rating, accent quote line,
  full unclamped body, rounded photo strip) via `AdminTestimonialDetailContent`, then an **Author** / **Autor** card
  (`AdminTestimonialAuthorCard`: avatar, email, open-user, offer link) and related **Public pages** as overview-style link cards (city /
  partner / occasion / chef). Cook detail also shows the low-rating alert when present. Pinned footer: **Edit**, **Public view**,
  **Publish** when pending, and overflow for **Unpublish** / **Delete**. Edit mode swaps the footer to Cancel / Save and unlocks override
  fields plus `AdminTestimonialImageManager`. AlertDialog confirms publish / unpublish / delete (not browser `confirm`). Star input, not
  numeric dropdowns. **Public view** alone opens `TestimonialDetailDialog`. Publication uses `StatusBadge` (green published / yellow
  pending).
- Offer detail **Review** tab when completed or either side already has a testimonial — side-by-side Customer → cook and Cook → guest
  columns (`AdminBookingRequestOfferTestimonialsSection`). Missing side shows the create form (including draft photo upload via
  `imageFileUploadIds`); existing side is a read-only `TestimonialCardFace` with photo manager, Edit / publish / delete, plus a link to the
  dedicated admin customer/cook testimonial page. Publish/unpublish/delete use AlertDialogs.
- City, partner, and occasion editors: ordered picker across customer and cook testimonials; shared `AdminPageTestimonial.isPubliclyListed`
  (like `AdminFeaturedCook.isPubliclyListed`) flags curated rows that are not yet public. Admin live preview keeps those rows visible with a
  card `StatusBadge` and section `StatusAlert` (public pages still omit them).

### Public

- Shared public tile (`TestimonialCard`): fully clickable (hover wash + underline on “Bewertung ansehen” / “View review”), occasion as the
  card title (stars + numeric rating top-right; that row is omitted when both are missing), a 4-line clamped quote with the accent
  quote-line, a 4-column square photo strip (4th slot becomes “+N more” when there are more than four), and author with written date only
  (city hidden on the tile when a date exists; undated quotes show the city instead). The detail opens from the card, the view link, or a
  photo thumb. Below `md` that detail is a full-page sheet sliding in from the right: a back control, one scroll, and an edge-to-edge photo
  when there are images. From `md` up it stays a centered dialog. With photos, the gallery (horizontal snap-scroll so photos swipe on
  mobile; arrows and thumbnails too) and the copy split that dialog evenly once it is wide enough (gallery left, copy right); each column
  scrolls independently so the gallery stays visible while the copy scrolls. Detail copy leads with “{name}'s experience at {occasion}”
  (`text-lg`, `text-2xl` from `@md` up), then rating and quote, then author below the body (same footing as the card) with one meta line
  “{date} in {city}”. On content pages and the landing card variant (`showBookingCta`), the booking ask (“Also looking for a … experience?”)
  sits above the primary CTA into `/booking-request/form` with `occasion` prefilled (free, no obligation, centered under the button). Chef
  profiles and the booking request plan keep testimonials proof-only (no CTA in the dialog).
- Chef profile: hero star row and the same card from published customer reviews (section hidden when empty). Grid 1 → 2 (`@2xl`) → 3
  (`@5xl`). Cook’s own public preview omits both (no live public fetch there).
- City, partner, and occasion pages: curated section after featured cooks; hidden when empty. Default grid is 3 columns; plan uses 2 beside
  the sticky sidebar. Attachment downloads need a published `imageUrls` hit (public) or any testimonial hit for admins — see
  [file-storage.md](../architecture/file-storage.md).
- Home: static marketing quotes. Scrolling marquee unless `LANDING_TESTIMONIAL_CARDS` is on, which renders the same quotes as the shared
  card — [landing.md](./landing.md).
- How to become a chef: static chef quotes (not the shared card, not database-driven).

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
- Shared rating gate: `src/shared/testimonialRating.ts` (`isTestimonialRating`, `testimonialRatingAssertRequired`) — every write command
  requires an integer 1–5 and rejects `0` / null
- GraphQL: public and admin types, offer fields, city/partner curation, admin `testimonials` + upserts, user/cook
  `bookingRequestOfferTestimonialUpsert` (body, rating, images; cook also `lowRatingAnswers`)
- Commands / queries: `*Testimonial*` under commands and queries (incl. `adminCustomerTestimonialUpsert` / `adminCookTestimonialUpsert`,
  `adminTestimonialsFindMany` for the combined catalog, `userBookingRequestOfferTestimonialUpsert` /
  `cookBookingRequestOfferTestimonialUpsert`, which re-apply `publicationStatusFromRating`); admin assistant list tool
  `toolAdminTestimonialsFindMany` (customer + cook, in-process filters) → `admin.testimonialList` cards
- Utils: publication from rating, offer fallbacks, image URLs from file uploads, junction cleanup
- Public UI: `SectionCookHero` / `SectionCookTestimonials`, `SectionPageTestimonials` + `TestimonialCard` / `TestimonialCardFace` /
  `TestimonialDetailDialog` in `src/web/components/TestimonialCard.tsx` (photo strip; full-page right sheet below `md` via `useIsMobile`,
  split dialog from `md` up; content pages and the landing card variant pass `showBookingCta` for occasion question + form CTA; mobile
  always 1 column, `columns={2|3}` from `@md`), `ContentPageTestimonialsEditor`
- Admin UI: `AdminTestimonialsPage` card grid via `AdminTestimonialListCard` on unified `Admin.testimonials`; detail entry
  `AdminTestimonialPage` (kind `customer` | `cook`) with typed routes and kind modules (`AdminCustomerTestimonialPage` /
  `AdminCookTestimonialPage`) using `AdminPinnedFooterLayout` with read-only `AdminTestimonialDetailContent` +
  `AdminTestimonialAuthorCard` + placement link cards → edit form + image manager; offer Review tab is a two-column comparison
  (`AdminBookingRequestOfferTestimonialsSection`: upsert when missing/editing with photos, `TestimonialCardFace` +
  `AdminTestimonialImageManager` + Edit when present, `StatusBadge` publication, AlertDialog confirms); detail **Public view** reuses
  `TestimonialDetailDialog`; `publicPagePlacements` via `adminTestimonialPublicPagePlacementsLoad` / `AdminTestimonialPublicPagePlacements*`
- GraphQL: admin `testimonials` union list + `customerTestimonialUpsert` / `cookTestimonialUpsert`; public `CustomerTestimonial` /
  `CookTestimonial.authorProfilePicture` (batch-loaded from the author’s current profile picture)
- Download auth: `fileUploadReferencedByPublishedTestimonial` / `fileUploadReferencedByAnyTestimonial` on `GET /api/file-uploads/:id`
- Capture UI: `BookingRequestOfferTestimonialPanel` (TanStack Form, accent stars, 4-col photo strip, inline validation, optional
  `imageFileUploadIds`; multi-select file input up to 8 photos; each image is client-compressed via `imageCompress` /
  `IMAGE_COMPRESS_PRESETS.testimonial` before `POST /api/file-uploads` — no crop dialog; post-submit reuses `TestimonialCardFace` +
  `TestimonialDetailDialog` with Edit review / View review in a dedicated action row under the card (stacked full-width on small screens);
  full self-edit of rating / text / photos with pinned Save/Cancel) — Review tab on customer and cook offer pages; compose Submit via
  `BOOKING_REQUEST_OFFER_TESTIMONIAL_FORM_ID`, edit via `BOOKING_REQUEST_OFFER_TESTIMONIAL_EDIT_FORM_ID` in `ProfilePinnedFooterLayout`.
  Compose form is a bordered card with counterpart avatar/name (“Bewertung für…”), prompt-style field titles (stars, body, photos) with
  required/optional hints, `md` stars, and a photo prompt (“Teile deine Eindrücke” / “Share your impressions”, optional up to 8).
  Outstanding Review tab uses inline `NotificationBadge`. Admin offer Review tab and detail `AdminTestimonialImageManager` use the same
  multi-select + compress path (cap 8).
- List nudges: customer request/offer cards read `testimonialMissing`, show corner `NotificationBadge` when unread is 0, deep-link
  `?tab=testimonial`
- Jobs: `bookingRequestOfferTestimonialReminder` (memory nudge, morning and evening reminders Europe/Berlin); schedule on payment success
  and datetime changes; cancel on request cancel
- Email and Utility WhatsApp templates for each nudge kind and audience. WhatsApp uses the recipient locale, saved message snapshots, and
  direct booking/review links. Email remains independent when Meta approval or delivery is unavailable.
- Email templates and outbound purposes for each nudge kind — [jobs.md](../architecture/jobs.md#testimonial-reminders),
  [outbound-email.md](../architecture/outbound-email.md)

| Job kind | When (Europe/Berlin) | Purpose                       |
| -------- | -------------------- | ----------------------------- |
| Memory   | Event start + 1 hour | Mid-event photo nudge         |
| Morning  | Day after 09:00      | Ask for review                |
| Evening  | Day after 19:00      | Second nudge if still missing |

Handler skips canceled, unpaid, or not dual-accepted offers and skips parties who already submitted so one side finishing does not block the
other’s reminders.
