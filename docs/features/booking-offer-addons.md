# Offer extras

Cooks keep a library of optional extras (a welcome drink, a birthday cake) and can attach them to an offer. The guest turns optional extras
on or off before they accept, and the price follows.

## Behavior

### Admin templates

Operators manage suggestion templates under **Catalog → Offer extras** (`/admin/offer-addon-templates`).

- The list shows German title, publish state, suggested price, and last update. **New template** creates a draft and opens it.
- The editor covers German and English title and description, pricing unit (flat or per person, with the same guest-count explanation as the
  cook editor), suggested price in euros, sort position, a published switch, and an optional image. **Delete** removes the template. Copies
  already in a cook library stay.

Published templates are what cooks see as suggestions. Drafts stay in admin only.

### Cook library

When `BOOKING_REQUEST_OFFER_ADDONS` is on, cooks see **Offer extras** in the profile nav (`/profile/offer-addons`). When it is off, the nav
item is hidden and the pages return to the profile overview.

- The library lists the cook’s own extras with title and price.
- **Custom offer extra** creates a draft and opens the editor. The editor explains guest-facing title and description, the image, and the
  two pricing units: **flat** is once for the event, **per person** multiplies by paying guests (discounted guests count as half). v1 extras
  are optional for the guest. **Delete** removes a library extra. Extras already copied onto an offer stay on that offer.
- **Add from suggestions** lists published admin templates. Adding one copies it into the library (locale title and suggested price) and
  opens the editor so the cook can change it.

### Offer create

On the price step of offer create, when the toggle is on, the cook can tick library extras to attach. The choice is kept in the URL as
`addons=` next to the menu draft. The create call sends those ids as `suggestedAddonIds`. With the toggle off, that step is hidden and no
extras are attached.

Attached extras start unselected for the guest.

### Guest offer

On the offer tab, when the toggle is on, the offer has extras, negotiation is still open, and payment has not started, the guest sees a card
per extra (image, title, description, flat or per-person price) with a meal-style `+` / check selection control. Choosing one saves
immediately. The same picker also appears on checkout in the left summary column below the configured menu while payment is still `EMPTY`,
so extras can still be toggled before the card is charged. The price overview already includes the selected lines from the server and
updates when the offer refreshes. Required extras, if any, stay selected and cannot be removed. Once payment has started (`SETUP` / `PAYED`
/ …), the picker is hidden. The cost breakdown still shows what was selected.

### Cook offer

The cook’s offer tab lists attached extras with title, price, and whether the guest selected them. Editing the set on an existing offer is
not in this surface yet.

## Decisions

### Alternatives considered

| Option                                       | Pros                                   | Cons                                                                     |
| -------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| Free-text extras typed into the offer chat   | No new library                         | Price would not stay in the total, and the guest could not toggle a line |
| One global catalog every cook must use as-is | Consistent names                       | Cooks could not set their own price or wording                           |
| Required extras in the first UI              | Covers extras that are always included | Guests cannot decline them, so the first version stays optional          |

### Chosen

Admins publish bilingual templates. Cooks copy them or write their own, then choose which library extras ride along with an offer. Guests
toggle optional extras while payment is still empty (offer tab before accept, and checkout after dual-accept), and the server reprices the
offer. After dual-accept, near-term PaymentIntents are cancelled and re-prepared when the customer total changes; SetupIntent paths only
need a Stripe refresh when the total drops to €0.

## Next steps

Cooks cannot yet change the extras on an offer after it is sent. A later edit step can replace the attached set from the library.

## Implementation

Toggle `BOOKING_REQUEST_OFFER_ADDONS`. Library rows are `CookOfferAddons` with `bookingRequestOfferId` null. Offer copies are separate rows.
Templates are `OfferAddonTemplates`. Guest selection is `customerSelected` on those offer copies; dual-accept reprices `addonPriceCents`
from the selected rows. There is no frozen JSON snapshot on the offer.

GraphQL:

- Admin: `offerAddonTemplates`, `offerAddonTemplate`, `offerAddonTemplateUpsert`, `offerAddonTemplateDelete`
- Cook: `offerAddons`, `offerAddon`, `offerAddonTemplates`, `offerAddonUpsert`, `offerAddonDelete`, `offerAddonCloneFromTemplate`
- Create: `BookingRequestOfferCreate.suggestedAddonIds`
- Guest: `bookingRequestOfferAddonSelectionUpdate` (reprices, publishes `userUpdates` so the subscribed cost breakdown refreshes; after
  dual-accept with `paymentStatus: EMPTY`, may cancel/re-prepare Stripe)
- Offer types expose `addons` and `addonPriceCents`

UI:

- `AdminOfferAddonTemplatesPage` / `AdminOfferAddonTemplatePage`
- `ProfileCookOfferAddonsPage` / `ProfileCookOfferAddonEditPage` (nav gated in `CookSidebar`)
- Shared guest picker `BookingRequestOfferAddonSelectionList` (image cards + `+` / check, same pattern as meal selection)
- Guest picker on `ProfileCustomerBookingRequestOfferPage` Offer tab and `ProfileCustomerBookingRequestOfferCheckoutPage` left sidebar
  (below configured menu)
- Library picker on the price step of `ProfileCookBookingRequestOfferCreatePage` (`addons=` draft)
- Readonly list on `ProfileCookBookingRequestOfferPage` Offer tab

Prices in forms use `centsToEuros` / `eurosToCents`. Display uses `offerAddonPriceLabel`.
