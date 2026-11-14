# Chef-page exclusive booking request

Guests can send a booking request from a public chef page to that cook only, then later open it to nearby chefs.

## Behavior

1. When `BOOKING_REQUEST_COOK_DIRECT` is on and the cook is offer-ready (visible, admin-approved, Stripe complete, travel origin set), the
   public chef-page **Send request** CTA names the chef and opens `/booking-request/form?cookId=`. Published complete menus with at least
   one meal picture appear on `/chefs/$pathName` (and cook preview); **Request this menu** opens the same wizard with `?cookId=&menuId=`.
   Cook WYSIWYG preview at `/profile/public` follows the same CTAs. Listing cards and city/venue/occasion grids stay profile links.
2. The form keeps `cookId` and `menuId` across draft URL sync and the auth redirect (`menuId` is dropped when `cookId` is absent). Chrome,
   price-class help, message address, and submit label name the chef, and name the menu when that catalog item is still available. The venue
   step has a short hint that the cook can still come if the place is farther than usual (no kilometers, no “delivery area”). There is no
   last-step checkbox.
3. Create stores `requestedCookId`, sets `PUBLICATION_DIRECT_TO_COOK`, and notifies only that cook (email + in-app). When the menu is
   catalog-eligible, it also freezes `requestedMenuId` plus a snapshot on that cook’s `BookingRequestCooks` row. The nearby-pool WhatsApp
   template is not sent. Ordinary ≥12 admin review does not run on exclusive create. Cooks cannot create booking requests.
4. If the toggle is off, or the cook is not offer-ready, leftover `?cookId=` (and any `menuId`) shows an info alert and creates a normal
   marketplace request. If the cook is eligible but the menu is not catalog-eligible, the request stays exclusive without a menu and the
   form explains that.
5. The submitted page, confirmation email, customer list chip, and request detail name the chef. Expand (**Also get offers from other
   chefs**) is always available while the request is still exclusive and not dual-accepted. It is secondary while waiting or while an offer
   is live, and primary after the requested cook has no live path (declined, offer declined, or banned). A confirm dialog says nearby chefs
   will also receive it and that this chef stays on the request. Customers never see “seen”, response-time promises, or the cook’s decline
   reason.
6. After a dead path, the customer also gets an email that this chef cannot make it this time, with the same expand CTA on the request.
7. Expand under 12 guests flips to auto-approved and notifies other offer-ready cooks in travel radius (skips already notified or declined).
   Expand at 12+ waits for admin review. `requestedCookId` survives. The requested cook stays in the pool even outside their usual radius.
8. That cook sees a pinned **Requested you** pool section, a purple badge (after expand: also open to others), overview attention
   (`DIRECT_BOOKING_REQUEST`), and a distinct email (menu title when frozen). Pool cards and detail name the requested menu. Offer create
   preselects that library menu when it still exists and is complete, with a banner; the cook can add or swap. After expand the badge stays
   and radius cooks do not inherit the menu. Attention and the pin clear on decline or offer create.
9. Admin has a chef-page direct publication tab, requested cook on cards/detail, Slack note, and a stale-direct filter (exclusive, older
   than 24 hours, no offer from the requested cook). Notify-more stays gated until the request is no longer exclusive.

## Decisions

### Alternatives considered

| Approach                                              | Notes                                                                   |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Reuse `PUBLICATION_APPROVED_BY_ADMIN` for exclusivity | Rejected. Mixes ops review queues and charts with a guest-chosen cook   |
| Silent pool pin without a new publication status      | Rejected. Other cooks in radius would still see the request             |
| Auto-expand after N hours of silence                  | Rejected for v1. Silence is not a decline. Expand stays customer-driven |
| Last-step “send only to this chef” checkbox           | Rejected. One exclusive create path from the chef page                  |
| Named CTA for cooks who cannot create offers          | Rejected. The guest would wait on a cook who cannot send a price        |
| Kill switch on existing exclusive rows                | Rejected. The toggle gates public entry only                            |
| Show “seen” to the customer                           | Rejected. Implies an SLA we have not measured                           |

### Chosen

Dedicated `PUBLICATION_DIRECT_TO_COOK` plus nullable `requestedCookId` on the request header. Guest-chosen menus live on the requested
cook’s affinity row (`requestedMenuId` + frozen snapshot) so expand cannot leak them. Entry is feature-toggled. Notify the chosen cook
immediately. Ops can see and help but do not gate publish. Expand is always available, more prominent after a dead path. Offer-ready cooks
only. Still a booking request: the cook prices the offer; no auto-offer.

## Next steps

1. Direct CTA on listing / featured cook cards, still `cookId` only unless a menu is in context.
2. 24h cook unopened reminder (email, not auto-expand).
3. Same-date duplicate-request hint on the form.
4. Dedicated `/chefs/$pathName/book` only if the long wizard drops conversion.

## Ideas

A dedicated Meta WhatsApp template for chef-page requests, once approved. Until then email + in-app is enough.

## Implementation

| Piece                     | Path                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Column / publication enum | `BookingRequests.requestedCookId`, `PUBLICATION_DIRECT_TO_COOK`                                                      |
| Menu on affinity          | `BookingRequestCooks.requestedMenuId` (FK, `onDelete: set null`) + `requestedMenu` JSONB snapshot                    |
| Entry toggle              | `BOOKING_REQUEST_COOK_DIRECT`                                                                                        |
| Eligibility               | `cookCanReceiveDirectBookingRequests`, `cookIsEligibleForBookingRequestPool`                                         |
| Public catalog            | `publicCookMenuFindMany`, `cookMenuIsPublicCatalogEligible`                                                          |
| Create / expand           | `userBookingRequestCreate`, `userBookingRequestOpenToOtherCooks`                                                     |
| Resolve leftover `cookId` | `bookingRequestDirectCookResolve`                                                                                    |
| Resolve leftover `menuId` | `bookingRequestDirectMenuResolve`                                                                                    |
| Notify                    | `bookingRequestCooksNotify({ direct: true, requestedMenu })`, purpose `BOOKING_REQUEST_COOK_DIRECT_NOTIFY`           |
| Dead-path email           | `userBookingRequestDirectNeedsExpansionEmailSend`                                                                    |
| Attention                 | `CookAttentionKind.DIRECT_BOOKING_REQUEST`                                                                           |
| Session events            | `BOOKING_REQUEST_CREATED.requestedCookId` / `requestedMenuId`, `BOOKING_REQUEST_OPENED_TO_OTHER_COOKS`               |
| Customer form / submitted | `BookingRequestFormPage` (`?cookId=&menuId=`), `BookingRequestSubmittedPage`, `BookingRequestOpenToOtherCooksButton` |
| Public menus              | `SectionCookMenus`, `PublicCookMenuDialog`, `ChefProfileView`                                                        |
| Cook pool                 | `ProfileCookBookingRequestPoolPage`, `CookBookingRequestCard`, offer-create preselect                                |
| GraphQL                   | `UserBookingRequestCreate.requestedMenuId`; `requestedMenu` on User / Cook / Admin booking request                   |
| Admin                     | publication tab, `staleDirect` criterion, requested menu on detail/list                                              |

Related: [booking-request-create.md](./booking-request-create.md), [booking-offers.md](./booking-offers.md),
[public-chefs.md](./public-chefs.md), [admin-booking-requests.md](./admin-booking-requests.md),
[admin-feature-toggles.md](./admin-feature-toggles.md), [architecture/booking.md](../architecture/booking.md),
[architecture/attention.md](../architecture/attention.md), [architecture/session-events.md](../architecture/session-events.md).
