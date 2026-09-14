# Booking offers

Cooks browse open requests, submit offers, and negotiate until customer and cook both accept. `Users.status` must be `ACTIVE` for cook offer
create / negotiate and for customer booking / accept / pay paths; a ban auto-declines the cook’s open offers — see
[admin-users.md](./admin-users.md) and [account.md](./account.md).

## Behavior

1. **Cook** sees published requests in `/profile/booking-request-pool` (open / declined tabs; list cards show event date only, exact time is
   on the request detail). Open pool cards show an approximate cook payout row (**Verdiene ca.** / **Make about**) from
   `estimatedCookPayoutCents`. Pool detail shows venue as post code, city, and country only (not the street), with a quiet hint that the
   exact address is shared after mutual accept and is already used for travel expense calculations. The pinned footer repeats the same
   approximate payout (soft suggested price × paid participants, travel, cook platform fee — same breakdown as offer create). Footer stacks
   payout above equal-width decline / make-offer on narrow panes; from `@md` payout sits left of the button pair. Opening a request marks it
   viewed; they may decline with a reason, or start **Make offer** when Stripe Connect and travel origin are ready. After decline or offer
   create, if more open requests remain they return to the open pool (Tinder-style review); if that was the last open request, decline lands
   on the declined tab and offer create forwards to the offer just created — never leave the cook on an empty open pool. Stale notify-email
   deep links use `Cook.bookingRequestLookup`: pool-eligible cooks (auto-approved + in radius, or admin-approved + `notifiedAt`) get a
   differentiated unavailable state (canceled / taken / expired / already offered) with **no** request PII; every other denial is identical
   not-found (no existence oracle). Admin analytics tracks this path as a cook × request funnel (notified → opened → declined or offer
   create → menus → price → created); see [admin-analytics.md](./admin-analytics.md).
2. Offer create (`/profile/booking-request-pool/$id/create`): no request summary (pool detail already covered that). Two steps with a thin
   progress bar (same visual as the public booking-request form): (1) pick menus (or **New menu** / **Edit** → `/profile/menus/$menuId/edit`
   with safe `returnTo`), then **Continue**; (2) set **price per person**, see price-class guidance and payout / customer-total preview
   (price step capped at `max-w-lg`, same as cook edit-price), optionally add a **personalized message** to the guest (phone numbers
   blocked, same policy as offer chat), then **Make offer**. The create UI emits funnel `step_entered` / `step_completed` interactions for
   admin analytics. Footer **Back** returns to menus. Draft state is URL-backed (`?menus=&price=&message=&step=`) so return from menu edit
   restores selection, price, message, and step (`step=price` only when on the price step; omitted defaults to menus; `step=price` without a
   complete menu selection snaps back to menus). A newly minted menu id (or an incomplete menu opened via **Fertigstellen**) is included in
   `menus` and stays selected when complete. Incomplete inventory menus (any course missing a title or meal options) stay visible with an
   **Incomplete** badge and a **Fertigstellen** / **Finish** CTA (cannot be selected until complete). The create UI requires at least one
   complete menu: **Continue** stays disabled until then; if submit somehow lacks menus, a `StatusAlert` (`error`) appears above the menu
   picker on step 1. The server still accepts an empty `suggestedMenuIds` list. The optional message is seeded as `COOK_MESSAGE_SIMPLE`
   after `COOK_CREATED` in the offer chat. The customer is emailed that a new offer exists.
3. **Customer** compares offers as cards on the request detail page (cook photo, city, cuisine / philosophy tags, menu hint, price,
   lifecycle pill, and a CTA into the offer). When at least one offer exists, the overview tab shows an info banner above the cards asking
   them to review, compare menus, chat, or call before deciding. They then open `/profile/booking-requests/$id/offers/$offerId` (tabs: offer
   / chat / call / testimonial / support; default Offer, clean URL; Chat uses `?tab=chat`). Offer tab shows menus, cook block, cost, and
   discount redeem / remove via `BookingRequestDiscountEditor` below the cost card while unpaid and not yet dual-accepted (no empty-state
   copy; input hidden once a code is applied — remove first to enter another; UI follows server/`userUpdates` state only, no optimistic
   discount patch). When several menus are suggested, the customer picks via selectable menu cards (meal-image collage, clamped title /
   description, course count); courses for the selected menu stay below. Long menu descriptions and the cook bio use expandable text
   (collapsed to a few lines with a fade; click to expand). Applied promo / gift fold into `costBreakdown` (negative line items + total via
   `CostBreakdownPanel`; no per-person or before-discount rows; muted footer notes that travel is included). On wider panes the menu sits
   left and cook / pricing sit right. While the customer still needs to accept, a pinned footer on the Offer tab holds **Accept**; decline
   stays in the header overflow menu and opens a reason dialog (free-text plus suggested chips for price / menus / special requests).
4. **Cook** manages offers at `/profile/booking-request-offers` with Active / Completed (**Stattgefunden**) / Archive tabs
   (`?view=completed` / `?view=archived`; default Active omits `view`). Inbox cards show event date only; while negotiating, amount row is
   **Auftragswert** / **Order value** from `totalWithoutDiscountsCentsCustomer`; after mutual accept, **Auszahlungsbetrag** / **Payout
   amount** from `payoutCentsCook`. Detail stays at `/profile/booking-request-offers/$offerId` (tabs: offer / chat / request / call; default
   Offer) regardless of list tab. The **Request** tab reuses the pool-detail summary card (occasion, participants / restrictions, date with
   relative day, preferences, venue, estimated travel distance / expenses, and invoice address after checkout) without the guest’s initial
   message; venue is post code, city, and country while negotiating and the exact address after mutual accept; invoice address appears once
   the offer is dual-accepted and the customer has paid (same reveal gate as the street). On the Offer tab while negotiating, end-aligned
   **Suggest another menu** / **Adjust price** buttons sit under the menu grid and the readonly cost overview
   (`BookingRequestOfferCostOverviewPanel`, same expandable cook payout / host price cards as edit-price) and link to `/edit-menus` and
   `/edit-price` (view-first; Discard / Save on each edit page; edit-menus uses the same incomplete-menu picker rule and **New menu** /
   **Edit** → menu edit + `returnTo` loop as offer create, with `?menus=` for the selection draft). Suggested menus use a 1–2 column
   `CookMenuCard` grid that opens `/profile/menus/$menuId` (view-first detail with edit). Auto-adjusted prices show an info banner above the
   cost overview. They can also re-accept or withdraw.
5. Negotiation continues until both sides accept (at most one dual-accepted offer per request) or someone declines / the request is
   canceled. Customer request edits can clear cook acceptance and email cooks; menu updates email the customer.
6. Dual acceptance moves into payment — see [booking-payment.md](./booking-payment.md). Chat rules:
   [booking-offer-chat.md](./booking-offer-chat.md). Calls: [booking-request-offer-calls.md](./booking-request-offer-calls.md).

Admins can create / edit offers, cancel cancelable requests, and hand a dual-accepted offer to another cook (close old + create/upgrade new;
never mutate `cookId` in place) — [admin-booking-requests.md](./admin-booking-requests.md). After a customer freezes a configured menu on an
offer, admins can patch that snapshot (title, description, courses/meals) without changing cook inventory menus.

## Decisions

### Alternatives considered

| Approach                                                            | Notes                                                                                          |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Isolated offers — cooks never see peers’ prices or menus            | **Chosen** — avoids race-to-bottom and copycat menus; each cook competes on their own proposal |
| Show other cooks’ offer forms / prices to cooks                     | Rejected — harms cook trust and platform fee integrity                                         |
| Menu required on cook offer create (UI)                             | **Chosen** — create page requires ≥1 complete menu; server still allows empty for ops/admin    |
| Menu required on every offer (server)                               | Rejected — API still accepts empty `suggestedMenuIds`                                          |
| Customer comparison board (side-by-side matrix)                     | Rejected for go-live — sequential offer cards on request detail; board can return later        |
| Cook-only offer create                                              | **Chosen** for the default path; admins may also create offers for ops                         |
| Admin-only authored offers                                          | Rejected as the sole path — cooks must own pricing and menus                                   |
| Open / Accepted API unions mirroring old dialogs                    | Rejected — derived status enum drives UI                                                       |
| Separate `/archived` route + fat `CookBookingRequestOffers` wrapper | Rejected — pool-style tabs + flat `[CookBookingRequestOffer!]!` with `bucket` criterion        |
| Homepage “Stattgefunden” section separate from inbox                | Rejected — Completed tab on the offer inbox is the single surface                              |

### Chosen

One offer per cook per request; dual-accept flags; suggested menus required on the cook create UI (server still allows empty); customer sees
offer cards then a dedicated offer page; cooks work from pool → create → offer inbox (Active / Completed / Archive tabs). Peer offer
contents stay private to each cook (plus customer / admin).

## Next steps

1. **High — Customer menu-change request** — Let the customer ask for menu tweaks before accepting (status path partly exists; customer
   mutation + cook email still missing). See [Ideas](#customer-menu-change-request).
2. ~~**Low — AI menu evaluation**~~ — Shipped; see [ai-menu-evaluation.md](./ai-menu-evaluation.md).

## Ideas

### Customer menu-change request

Customer likes an offer but wants menu tweaks before accepting:

1. Customer sends a menu-change request (message + flag on the offer); cook unread increments; timeline shows the request.
2. Cook responds by updating suggested menus (already clears the flag and emails the customer).

Planned cook email: greet cook; name the customer; ask to review comments and adjust so the customer can decide; CTA to the cook offer page.

### Customer cross-offer calls hub

Cooks already have `/profile/calls`; a customer equivalent across offers is deferred — see
[booking-request-offer-calls.md](./booking-request-offer-calls.md).

### Accepted offer route preview (Google Maps)

After mutual accept, show a Google Maps route preview from the cook’s travel origin to the event venue so both sides can see drive time and
path before the event. Exact venue address is already shared only after dual accept; the map should reuse that moment (cook offer detail
and/or customer offer detail), not expose the street earlier in the pool. Prefer an embedded directions preview over opening a blank
external tab; opening the same route in Google Maps remains a useful secondary action.

## Implementation

### Data model (offer side)

| Table                                               | Purpose                                                                                                           |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `BookingRequestOffers`                              | Dual accept, cents fee breakdown, `paymentStatus` / `paymentData`, optional `configuredMenu`; chat-notify job ids |
| `BookingRequestOfferEvents`                         | Typed timeline; GraphQL projects `messages: [ChatMessage!]!`                                                      |
| `Menus.bookingRequestOfferId`, `Menus.copyOfMenuId` | Optional offer menu copies                                                                                        |

Constraints: unique `(bookingRequestId, cookId)` on offers; partial unique one dual-accepted offer per request. Domain:
`src/server/domain/bookingRequest.ts`, `bookingRequestOfferCostBreakdown.ts`. Customer hydrate (`userBookingRequestHydrate`) passes request
promo / gift (+ participant count) into each offer’s cost breakdown.

### GraphQL / commands

- Role-scoped `*BookingRequestOffer` types; customer offers nest `cook: PublicCook` + `suggestedMenus: [PublicCookMenu!]!`; cook offers keep
  `suggestedMenus: [CookMenu!]!`; unread counters are role-scoped
- Derived `BookingRequestStatus` / `BookingRequestOfferStatus`; lifecycle pills —
  [styles/status-messaging.md](../styles/status-messaging.md)
- Cook offer inbox: `Cook.bookingRequestOffers(criterion: CookBookingRequestOfferFindManyCriterion)` with
  `CookBookingRequestOfferListBucket` (`ACTIVE` / `COMPLETED` / `ARCHIVED`) via `bookingRequestOfferListBucketDerive`; omit bucket = all
  (sidebar unread). List page aliases `activeOffers` / `completedOffers` / `archivedOffers`.
- Cook: `bookingRequestLookup` (union: available / canceled / taken / expired / own offer / not-found), `bookingRequestOpen`,
  `bookingRequestDecline`, `bookingRequestOfferCreate` (seeds request message then `COOK_CREATED`, then optional cook `message` as
  `COOK_MESSAGE_SIMPLE`), accept / decline / price / suggested-menus update — all publish `userUpdates` after commit
- Customer offer: accept / decline / configured-menu create / unread reset
- Admin: `bookingRequestOfferConfiguredMenuUpdate` replaces an existing configured-menu snapshot (preserves `menuId`)
- Pricing: `bookingRequestOfferPriceCalculate`, soft price-class guidance, promo hard min — see
  [architecture/booking.md](../architecture/booking.md)

### Surfaces

| Surface                                                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/profile/booking-request-pool` (+ `$id`, `$id/create`) | Pool (travel-radius intro + open / declined tabs) + detail + offer create; create has no request summary (detail already did); create keeps draft in `?menus=&price=&message=`; **New menu** → menu edit + `returnTo`; `ProfilePinnedFooterLayout` for actions; pool detail card matches customer request overview (`@md:` fields + `@xl:` 3-col with customer message in the same card); `CookMenuSelectPanel` uses base `Card` + container-query columns so profile + assistant sidebars shrink the pane correctly |
| `/profile/booking-request-offers` (+ `$offerId`)        | Offer inbox (Active / Completed / Archive tabs via `?view=`) + detail; Request tab uses `CookBookingRequestSummaryCard` (same as pool detail, without the guest message); Offer tab is full-pane width; suggested-menu `CookMenuCard` grid uses `@2xl` / `@5xl` (max 3 cols, same pacing as cook menus list) with cost overview and end-aligned edit CTAs when negotiating. Nested tab scrollports own the shell gutter (`px-4`) under `contentScroll={false}` so the scrollbar sits on the pane edge.               |
| `/profile/booking-request-offers/$offerId/edit-price`   | Price edit; pinned Discard / Save                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `/profile/booking-request-offers/$offerId/edit-menus`   | Suggested-menus edit; pinned Discard / Save; same `CookMenuSelectPanel` + draft→menu-edit `returnTo` as offer create (`?menus=`)                                                                                                                                                                                                                                                                                                                                                                                     |
| `/profile/booking-requests/$id/offers/$offerId`         | Customer offer page; Offer-tab pinned footer → Accept when `USER_NEEDS_TO_ACCEPT`; remount `key={bookingRequestOfferId}`; menu + cook/price split only at `@5xl` so suggested-menu cards stay full-width longer; same nested-scroll `px-4` gutter on tab panels as cook offer detail                                                                                                                                                                                                                                 |

### Key files

- Cook pool / create / inbox: `ProfileCookBookingRequestPoolPage.tsx`, `ProfileCookBookingRequestPage.tsx`,
  `ProfileCookBookingRequestOfferCreatePage.tsx`, `CookBookingRequestPoolUnavailable.tsx`, `ProfileCookBookingRequestOffersPage.tsx`,
  `ProfileCookBookingRequestOfferPage.tsx`, `ProfileCookBookingRequestOfferPriceEditPage.tsx`,
  `ProfileCookBookingRequestOfferMenusEditPage.tsx`, `CookBookingRequestCard.tsx`, `CookBookingRequestOfferCard.tsx`,
  `CookBookingRequestSummaryCard.tsx`
- Lookup query: `cookBookingRequestLookup.ts`, eligibility helper `cookBookingRequestPoolEligibility.ts`
- Customer offer: `ProfileCustomerBookingRequestOfferPage.tsx`, `CustomerBookingRequestOfferDeclineDialog.tsx`,
  `BookingRequestDiscountEditor.tsx`, `CustomerBookingRequestCard.tsx`, `CustomerBookingRequestOfferCard.tsx` (request-detail comparison
  cards: cook avatar, city, `CookProfileTags` cuisine/philosophy pills, menu/price, lifecycle pill, CTA); meal rows via `CustomerMealCard`
  in `OfferMenuConfiguration` / `OfferMenuConfigured` (select Plus/Check + details dialog)
- Shared card interaction: `bookingRequestCardInteraction.ts` (`hover:bg-muted/40`, `active:bg-muted/60`, focus ring) for admin, customer,
  and cook booking request / offer cards
- Price UI: `BookingRequestOfferPriceConfigurationPanel.tsx` (exports editable panel + readonly `BookingRequestOfferCostOverviewPanel`)
- Menu picker: `CookMenuSelectPanel.tsx` (container-query grid; `CookMenuCardMedia` collage from `courseMealOptionImages`; shared by offer
  create + edit-menus)
- Status: `BookingStatusPill.tsx`, `bookingRequestStatus.ts`, `bookingRequestOfferStatus.ts`
- Related: [booking-offer-chat.md](./booking-offer-chat.md), [booking-payment.md](./booking-payment.md),
  [booking-request-create.md](./booking-request-create.md)
