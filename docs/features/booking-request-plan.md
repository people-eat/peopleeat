# Booking request plan (2-step)

Public alternative create funnel: event details → auth / contact → real booking request. Designed for partner deep-links and works without a
partner.

## Behavior

1. Visitor opens `/booking-request/plan` (optional query: `partnerId`, `firstName`, `minDateTime` / `maxDateTime`, guests, venue, cuisine).
2. **Step 1 (details)** — title / subtitle and partner block sit above the details + sticky-summary grid. Greeting when `firstName` (or
   signed-in first name) is present. Title splits onto two lines below `@xl` (“Euer Abend.” / “Eure Experience.”); partner block (no card
   chrome, not a link) sits beside the title from `@xl` (image right, text right-aligned); below `@xl` it stays left-aligned with image left
   and text left-aligned. Hero card comes first: it stacks image over content, then from `@3xl` sits side by side (image left, copy right;
   image zooms slightly on hover); it does not show a per-person price. Date section follows (“Wählt euren Dinner Abend” / “Choose your
   dinner evening”) with smaller gray month + year on the right (or `month A - month B year` when the chip window spans two months). Date
   chips (larger square cards: short weekday with trailing dot, day number, short month; with `partnerId`, first/last foot labels become
   Anreise/Abreise instead of the month) use `grid-cols-3` → `@md:grid-cols-4` → `@2xl:grid-cols-6`, with a little more space between
   weekday, day, and foot label, only when both `minDateTime` and `maxDateTime` are set and the window has at most 14 days; otherwise the
   calendar DatePicker (with optional min/max). Price class sits above cuisine as the same three cards as the booking-request form (“Wählt
   euren Preisrahmen” / “Choose your price range”, subtitle “Als Orientierung für den Menüvorschlag eures Kochs.” / “As a guide for your
   chef's menu proposal.”; one column, three once the card row itself is 50rem wide, so a sidebar does not force three narrow columns;
   selected state `border-primary shadow-md`; “ab / starting at” on each card). The sticky summary lists the selected class title as a field
   row (Preisklasse / Price class), with no per-person total. Cuisine preference section sits below (after address Combobox when shown)
   without a wrapping card; subtitle under the title (“Als Inspiration für euren Koch…” / “As inspiration for your chef…”); options use a
   2-column grid on mobile and 4 columns from `@xl`; selected state is border + shadow (`border-primary shadow-md`), not a filled primary
   background. Cuisine options and date chips use the same pointer / hover / pressed / focus-visible interaction pattern as
   `SelectableChip`. Default price class is MEDIUM / Signature, still editable in the details editor (no fake cart total). Five-star row
   (cook-card style) and, when partner testimonials exist, “X Bewertungen ansehen” scrolls to that section; per-cuisine sample-menu dialog
   (title + courses keyed to the selected preference; each cuisine option also has “Beispielmenü”); edit guests / start time / cuisine /
   price class via bottom Sheet on mobile and Dialog on desktop (scrim locks + blurs the page); partner venue address is omitted from the
   sticky summary and shown as static copy in that editor with a partner-location hint. Without a partner location, the address Combobox
   stays on the page and in that editor so the venue can be chosen or changed. Sticky summary sidebar only from `@5xl`
   (`@5xl:sticky @5xl:top-20` on the column wrapper so it tracks while scrolling; single-column + bottom bar below that, so the sidebar does
   not crowd mid widths). Mobile bottom bar shows guest count (“Teilnehmer” / “guests”) plus the selected price class title (no date; that
   lives in the date chips), with a borderless edit affordance and primary Next CTA. Foretaste section is a horizontal carousel (5 reel
   cards, captions at top, prev/next at top right on all widths). Care section (“Ihr genießt…”) stays stacked below `@xl`, three equal cards
   from `@xl`. Partner testimonials reuse curated partner assignments via `SectionPageTestimonials` with `columns={2}` (sidebar width) and
   per-card detail dialogs.
3. **Step 2 (contact)** — centered `max-w-md` column (no sticky summary), matching the classic form auth width. Required wishes / allergies
   message first, then `AuthIdentityGate` (OTP / passkey / profile; `firstName` seeded from query when registering; register heading
   omitted, submit labeled “Buchungsanfrage senden” / “Send booking request”; `onReady` creates once message is filled). Already signed-in
   visitors get the same explicit send CTA. Back uses the standard `Button variant="link"` + `ArrowLeftIcon` pattern. The plan asks for
   guest counts, not individual names. Create stores one participant per guest with the same default names as the multi-step form
   (Erwachsener 1 / Adult 1, Kind 1 / Child 1).
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
