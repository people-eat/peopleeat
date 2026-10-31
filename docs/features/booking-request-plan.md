# Booking request plan (2-step)

Public alternative create funnel: event details → auth / contact → real booking request. Designed for partner deep-links and works without a
partner.

## Behavior

1. Visitor opens `/booking-request/plan` (optional query: `partnerId`, `firstName`, `minDateTime` / `maxDateTime`, guests, venue, cuisine).
2. **Step 1 (details)** — title / subtitle and partner card sit above the details + sticky-summary grid. Greeting when `firstName` (or
   signed-in first name) is present. Date chips (larger square cards: short weekday with trailing dot, day number, short month) only when
   both `minDateTime` and `maxDateTime` are set and the window has at most 14 days; otherwise the calendar DatePicker (with optional
   min/max). Cuisine cards and date chips use the same pointer / hover / pressed / focus-visible interaction pattern as `SelectableChip`.
   Partner card links to `/partners/$pathName` when `partnerId` resolves. Soft “ab / from” price guidance from the selected price class
   (default MEDIUM / Signature; editable in the details editor; no fake cart total); hero card shows a five-star row (cook-card style) and,
   when partner testimonials exist, “Bewertungen ansehen” scrolls to that section; per-cuisine sample-menu dialog (title + courses keyed to
   the selected preference; each cuisine card also has “Beispielmenü ansehen”); edit guests / start time / cuisine / price class via bottom
   Sheet on mobile and Dialog on desktop. Sticky summary sidebar only from `@5xl` (single-column + bottom bar below that, so the sidebar
   does not crowd mid widths). Foretaste section is a horizontal carousel (5 reel cards, captions at top, prev/next at top right on all
   widths). Without a resolved venue, address Combobox is shown. Care section (“Ihr genießt…”) uses three equal cards with line icons.
   Partner testimonials reuse curated partner assignments via `SectionPageTestimonials` with `columns={2}` (sidebar width) and per-card
   detail dialogs.
3. **Step 2 (contact)** — `AuthIdentityGate` (OTP / passkey / profile; `firstName` seeded from query when registering) plus optional wishes
   / allergies message. Submit calls `UserMutation.bookingRequestCreate` with the chosen `priceClassType` and lands on the existing
   submitted page.
4. Cooks are redirected to `/profile` (same as the multi-step form). Page is `noindex`.

Non-partner visitors use the same route. Venue resolution order: URL venue params → partner `locationAddress` → empty (Combobox).

## Decisions

| Approach                                       | Notes                                                   |
| ---------------------------------------------- | ------------------------------------------------------- |
| New route beside `/booking-request/form`       | **Chosen** — does not replace the wizard                |
| Soft “ab” price-class guidance, no grand total | **Chosen** — default MEDIUM; editable in details editor |
| Partner optional `locationAddress` jsonb       | **Chosen** — URL params override; reusable later        |
| AuthIdentityGate before create                 | **Chosen** — same create mutation as the form           |
| Share sheet / wine pairing                     | Deferred                                                |

## Next steps

- Partner CTA defaults may point at `/booking-request/plan?partnerId=…` instead of the multi-step form.
- Optional funnel session events for plan steps (mirror form instrumentation).

## Implementation

- Route: `src/routes/{-$locale}/booking-request_.plan.tsx`
- Page / search: `BookingRequestPlanPage.tsx`, `bookingRequestPlanSearch.ts` (+ tests)
- GraphQL: `BookingRequestPlanPage.graphql` (`publicPartner.findOne`, create mutation, location suggestions)
- Partner: `Partners.locationAddress`; `PublicPartnerQuery.findOne`; admin venue Combobox on `AdminPartnerPage`
- Auth: optional `profileInitialValues` on `AuthIdentityGate`
- Related: [booking-request-create.md](./booking-request-create.md), [partners.md](./partners.md)
