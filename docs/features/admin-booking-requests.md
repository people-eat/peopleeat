# Admin booking requests

Operators browse, create, approve, notify cooks on, and resolve booking requests and offers from the admin workspace.

## Behavior

Admins manage marketplace booking requests under `/admin/booking-requests` (hub + list + create + detail), with related **calls** hub at
`/admin/calls`. The admin home overview also surfaces requests blocked for review and due cook payouts as action queues.

### Overview — `/admin/booking-requests`

Publication distribution (total, blocked for review, auto-approved, admin-approved), all-time average guests per request, a
received-requests bar chart, then offer economics (average offers per request, average menu price, average paid customer total / GMV,
average paid platform fee, plus all-time and range-scoped total revenue / platform profit), top 5 occasions, top 5 creation months, and top
5 cooks by offers and by dual-accept conversions. Date range in URL drives daily chart buckets (zero-filled) and paid revenue/profit totals
in that window (by `paymentDateTime`, falling back to offer `createdAt`). Rankings, averages, and cook leaderboards stay all-time
(independent of that picker). Section cards link to list and create. Distribution cards deep-link into the list with `publicationStatus`
preselected (Total clears the filter). Cook rows deep-link to the admin user detail.

### List — `/admin/booking-requests/list`

Search by occasion, message, venue text, or customer email/name (first, last, or full name in either order). Tabs filter publication status
(admin review / auto-approved / admin-approved; omit = all). A **Status** select filters derived lifecycle (`WAITING_FOR_OFFERS` …
`CANCELED`; omit = all) via `AdminBookingRequestCriterion.statuses`. Sort select is always available (grid and list); list column headers
remain sortable too. **Clear filters** appears when search, publication, or status is set. **Card grid is default** (`view=grid` or omit);
`view=list` shows a sortable table. Grid cards show occasion, customer link, status and publication badges, event date, location,
participants, created date, and offer chips deep-linking to offer detail (unread accent, accepted-path ring). Sort and pinned bottom
pagination (page + per-page size; default 25) via URL. Status uses derived booking request status with **booking lifecycle pills**;
blocked-for-review also shows a publication badge. Exact event time is reserved for detail pages.

### Create — `/admin/booking-requests/create`

Pick existing customer, then same core fields as the public booking form (including per-guest dietary restrictions when
`BOOKING_REQUEST_RESTRICTIONS` is enabled). Optional `?userId=` prefills the customer (from the admin user detail booking-requests tab).
Publication and cook notify on create (no separate approve step):

- Under 12 participants → auto-approved publication; cook picker defaults to all in travel radius (deselect allowed).
- 12+ participants → admin-approved publication; picker defaults to none; at least one cook required when any are in radius.

Cook list from travel-radius preview before a row exists. Confirmation dialog before submit. Success → new request detail.

### Detail — `/admin/booking-requests/<id>`

Tabs via URL: **overview** (fields including per-guest restrictions when present, customer and accepted cook links, **Edit**, **Cancel
request** when status is cancelable, pending request-scoped `queuedJobs` including expire / no-offers / adjusted-message AI), **offers**
funnel: accepted offer pin, open offers, notified cooks without offers (re-notify), radius cooks not yet notified (suggest / notify / create
offer), and **discount** (apply / clear promo or gift codes via `BookingRequestDiscountEditor`, same rules as the customer: editable while
`WAITING_FOR_OFFERS` / `OFFERS_WAITING_FOR_REVIEW`, not canceled, and not dual-accepted; no empty-state copy; input hidden once applied).
Suggest and re-notify open a confirmation that states the cook will get an email (and, on first notify, the request in their pool). Bulk
create offer → dedicated create route. Edit mirrors the customer form for occasion chips, preferences, guest restrictions (collapsed by
default), and live `travelImpact` / `priceImpact` banners next to the venue and guest-count fields (admin also sees cook-payout deltas).
Changing venue, guests, preferences, or restrictions resets cook acceptance and emits offer timeline events; venue/headcount changes also
auto-adjust open-offer travel and menu prices (`priceAutoAdjustReason` + `SYSTEM_CHANGED_PRICE`, same as customer update). On a
dual-accepted offer, venue/participant edits use the amendment create/apply path (confirm dialog: propose to chef vs apply without cook
approval) instead of resetting acceptance. Other ops fields stay a non-resetting patch. Admin edit can set or clear `adjustedMessage`;
clearing it while changing `originalMessage` re-enqueues the AI rewrite when the toggle is on — see
[ai-booking-request-message.md](./ai-booking-request-message.md).

**Cancel request** uses the same cancelable statuses and customer/cook emails as self-serve cancel (`WAITING_FOR_OFFERS` /
`OFFERS_WAITING_FOR_REVIEW` / `EXPIRED`). Reason required. Writes `USER_CANCELLED` offer timeline events.

### Offer — `.../offers/<offerId>`

Fill-height shell. Tabs: **chat** (same concierge and phone policy as customer/cook — see [booking-offer-chat.md](./booking-offer-chat.md);
presence shows customer + cook + Juliana; admin can send until closed statuses; admin can edit any free-text chat bubble body via pencil →
dialog, including after send is closed), **offer** (cook / customer / accept metadata, hand over), **costs**, **menu**, **call** (LiveKit),
**testimonial** (when relevant). Legacy `?tab=schedule` still resolves to **call**. Planned: concierge tags surface on admin home —
[booking-offer-chat.md](./booking-offer-chat.md). Card sections use the shared base `Card`.

**Offer** holds people and lifecycle metadata: cook + customer cards via shared `AdminOfferPartyCards` (avatar + name/email, outline role
badge top-right, outline **Nutzer öffnen** to `/admin/users/$userId`; also used on `AdminCallPage`), an **Angebotsstatus** block (title
above card; 2-column grid: offer id with copy, long created date-time, then accept `StatusBadge`s; decline reasons full-width below when
present), and pending `queuedJobs`. Footer: **Edit offer** (`.../edit`, accept flags only) and hand over when dual-accepted. Offer status
pill sits top-right above the tabs (no payment-status pill in that chrome). When `participantAmendment` is pending, a warning alert in the
offer chrome (all tabs) shows the proposed deltas and host/cook price change, with a **View costs** shortcut; the same alert appears on
request offers (accepted pin), request edit, and price edit (with a replace-on-save footnote).

**Costs** is the ops economics surface: labeled cook/customer platform fees with stored percents, payment-provider fee, menu / travel /
payout / customer totals, and **Plattformgewinn / Platform profit** (`platformFeeCentsCook + platformFeeCentsCustomer`) highlighted in the
untitled economics card (no “Wirtschaftlichkeit” heading). When a promo or gift is applied, that card also shows **Kundenpreis vor Rabatt /
Customer total before discount**, one negative row per discount (code label from `costBreakdown`), then the post-discount **Kundenpreis /
Customer total** from `costBreakdown.total` (so pre-accept discounts are visible even while `totalCentsCustomer` is still null). Platform
profit stays fee-only; discounts are separate rows. The **Zahlung & Stripe** card explains `paymentStatus` with a bilingual `StatusAlert`
(ops label + one-sentence meaning, plus the technical enum for Stripe debugging via `adminBookingRequestOfferPaymentStatus*`), **Geplanter
Karteneinzug / Planned card pull** as a full date-time (`plannedPaymentPullDateTime`, event time minus 14 days on the SetupIntent path).
When that instant is already past and `paymentStatus` is still `EMPTY` / `SETUP`, a muted note explains the overdue pull
(`adminBookingRequestOfferPlannedPullPastNote`: charge right after card entry, or automatic pull should run shortly). The `SETUP`
`StatusAlert` description also switches to the overdue wording. Paid / payout timestamps the same way, and Stripe Dashboard deep links
(`stripePaymentIntentUrl` / `stripeSetupIntentUrl` when `paymentData` has those ids; test vs live from `STRIPE_SECRET_KEY`). Payout release
actions and dual cost views with **Kundensicht / Kochsicht** titles above, columns top-aligned. **Customer view** sits in a card around
`CostBreakdownPanel` (promo / gift negatives, optional before-discount, total, muted travel-included footer; gift amount prefers
`giftCardAppliedCents` after charge so the line survives a drained balance). **Cook view** renders `BookingRequestOfferCostOverviewPanel`
(`viewer: admin`) without an extra card wrapper (panel already has bordered sections) using **stored** offer fee amounts (not a live
recalculation), so migrated or historical fee snapshots stay honest; cook overview stays pre-discount by design. Admin create / edit-price
take menu price, travel, and sticky platform fee **percentages** (cook / customer, 0–100; defaults 18 / 4). Fee cents, payout, provider
estimate, and customer total (including `totalWithoutDiscountsCentsCustomer` and, when already set, `totalCentsCustomer` with any gift/promo
discount cents preserved) are always recalculated on write via `bookingRequestOfferPriceCalculate`. Edit-price shows a live € preview with
deltas vs the stored snapshot. Edit-price CTA (`.../edit-price`) lives on this tab’s footer only. On dual-accepted offers (`EMPTY` / `SETUP`
/ `PAYED`), menu/travel/fee-% edits use `bookingRequestOfferAmendmentCreate` (cook must accept) or `bookingRequestOfferAmendmentApply`
(bypass cook approval). Both reuse amendment Stripe rules (`EMPTY` cancel and re-prepare, `SETUP` columns only, `PAYED` refund/top-up). UI:
on save, a confirm dialog shows price/payment consequences and two explicit actions (**Propose to chef** / **Apply now (skip cook
approval)**). No feature toggle. Same path applies from request edit for venue/participants. Blocked for `TRANSFERRED` /
`PAYED_OUT_OF_SYSTEM` / `FAILED` and when preparations are locked (clear prep first). Pre-accept price edits still use
`bookingRequestOfferUpdate`. Fee percents stay sticky on later cook price updates, customer accept, and amendments.

**Menu** holds only configured / suggested menus (`OfferMenuConfigured` or `CookMenuCard` grid to `/admin/menus/$menuId`) — no cook/customer
header. When a customer has frozen a configured menu, admins can open `.../edit-configured-menu` to replace title, description, and
courses/meals (optional meal image URLs). Update-only: no create when the snapshot is missing. Accept-flag edits stay on `.../edit`; price
edits on `.../edit-price`.

**Hand over** (dual-accepted, event still in the future): closes the current offer and creates or upgrades a dual-accepted offer for another
cook in travel radius. Never mutates `cookId` in place. Admin chooses what to copy (price, configured menu, payment/payout dates, chat
messages). Optional `copyChatMessages` hard-copies `*_MESSAGE_SIMPLE` events (+ attachment joins) onto the new offer as a contiguous block
before `ADMIN_HANDED_OVER_TO_COOK`; prior cook messages carry `handedOverFrom` provenance so they do not appear as the new cook. System
events are not copied. New offers skip the usual request-message seed when chat is copied (it is already in the transcript). Timeline:
`ADMIN_HANDED_OVER_CLOSED` on the old offer, `ADMIN_HANDED_OVER_TO_COOK` (with `chatCopied` when messages were copied) on the new one.
Money: unpaid teardown + re-prepare; `PAYED` reverse Connect transfer(s) then transfer to the new cook; `PAYED_OUT_OF_SYSTEM` after explicit
confirm; `TRANSFERRED` blocked. The closed offer’s payment columns are cleared (`EMPTY`, no `paymentData` / schedule timestamps). See
[stripe-payment.md](../architecture/stripe-payment.md).

Payout actions when due (each with a confirmation dialog): **release** via Stripe Connect payout (gates on Connect readiness), **check if
payout already took place** (asks Stripe for a matching Connect payout; marks `TRANSFERRED` only when found, otherwise leaves the offer
unchanged), and **mark paid out-of-system** (`PAYED_OUT_OF_SYSTEM`, no Stripe call). The Stripe check is also available on
`PAYED_OUT_OF_SYSTEM` offers so an accidental out-of-system mark can be corrected when Stripe already paid out.

### Calls hub — `/admin/calls`

Overview: attention board (live, pending, upcoming, recent), distribution, charts, cook leaderboard. Attention rows use the same compact
`Card` density as offer/profile call cards (`bookingOfferCallCardClassName`). Distribution kind cards deep-link into the list with `kind`
(range-scoped outcomes also pass overview `from` / `to`); cook rows deep-link with `cookId` + range. List: full traffic with filters and
pinned bottom pagination (`page` / `pageSize`; default 25). Deep links to the offer Call tab.

Publication approve on overview when blocked (picker over radius cooks). Post-approve notify per cook.

## Decisions

### Alternatives considered

| Topic        | Choice                                                |
| ------------ | ----------------------------------------------------- |
| List layout  | Grid default + optional table; offer chips deep-link  |
| Hierarchy    | Hub + `/list` + `/create` like users                  |
| Pagination   | Counts query for totals                               |
| Search       | Occasion, message, venue, customer identity           |
| Publication  | Approve on detail/overview with cook picker           |
| Ops edit     | Dedicated admin patch (not customer update)           |
| Payouts      | Admin-gated release / Stripe check / out-of-system    |
| Admin create | Dedicated create with customer id + selected cook ids |

### Chosen

Mirrors users/legal hierarchy. Overview stats + received-requests chart + offer economics (averages, all-time and range totals) + all-time
top-5 occasion/month rankings and cook offer/conversion leaderboards; list with grid/table toggle; manual create with publication rules by
participant count; offer detail with chat, offer, costs, menu, call; admin calls overview + traffic list. Radius cooks without an offer show
estimated travel expenses and soft suggested menu price total (same guidance as cook pool / offer create).

## Ideas

- Concierge-tagged offers on `/admin` action queue ([booking-offer-chat.md](./booking-offer-chat.md)).
- Automatic recovery after bank `TRANSFERRED` (payout reverse) so handover can continue without Stripe Dashboard.

## Implementation

| Area     | Notes                                                                                                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages    | Overview, list (grid/table), create, edit, detail, offer (+ create / edit accept / edit-price / edit-configured-menu), calls overview/list                                                            |
| Queries  | Request/offer finders, counts, creations, occasion/month stats, average participants, offer economics, cook offer stats, calls, call traffic, cook stats                                              |
| Commands | Create/update/cancel request; discount apply/clear; create/update/handover offer; configured-menu update; publication approve; cook notify; payout release / already-took-place check / out-of-system |
| Nav      | `adminBookingRequests.ts`, `adminCalls.ts`, sidebar subs                                                                                                                                              |
| Routes   | Under `src/routes/{-$locale}/admin/` for booking-requests and calls                                                                                                                                   |

GraphQL (admin): `bookingRequests` / counts / creations / occasion stats / creation-month stats / average participants /
`bookingRequestOfferEconomics(range)` / `bookingRequestCookOfferStats` / single request; `bookingRequestOffers` / counts / single offer;
`cooksInTravelRadius`; create/update/cancel request; `bookingRequestDiscountUpdate`; create/update/handover offer;
`bookingRequestOfferChatMessageCreate` / `bookingRequestOfferChatMessageUpdate`; `bookingRequestOfferConfiguredMenuUpdate`; publication
approve; cooks notify; payout mutations; `calls`, `callTraffic`, slot/room creations, cook stats. Overview rankings omit chart `range` for
all-time (same pattern as gift-card overview). Economics averages and all-time paid totals ignore `range`; optional `range` scopes
`rangeTotalPaid*` by payment time. Paid revenue uses `PAYED` / `TRANSFERRED` / `PAYED_OUT_OF_SYSTEM`. Conversions are dual-accepted offers.
`AdminBookingRequest` exposes applied `promoCode` / `giftCard` snapshots. `AdminBookingRequestCriterion` supports optional `statuses`
(derived lifecycle SQL, same rules as `bookingRequestStatusDerive`), `createdAtFrom` / `createdAtTo` (used by the admin assistant “past X
days” list tool and available to the list API), and `bookingRequestIds` (`IN`; omit or empty = no id filter — admin assistant drill-in on
the same list tool).

UI building blocks: `AdminBookingRequestListCard` (list page + admin user detail booking-requests tab + admin assistant chat via
`admin.bookingRequestList` data parts), `AdminBookingRequestOfferCard` (request-detail offers funnel + admin user detail cook offers tab:
same comparison layout as customer offer cards — cook avatar, city, `CookProfileTags`, menu/price, admin lifecycle pill, call hint with
schedule deep-link, CTA), `AdminBookingRequestCookWithoutOfferCard` (same cook header layout for notified / radius cooks without an offer —
notify status pill, travel distance / expenses, suggested menu price, create-offer CTA + re-notify), shared hover / pressed chrome via
`bookingRequestCardInteractionClassName` (also used by customer and cook request/offer cards), shared `CostBreakdownPanel` (customer + admin
customer view), `BookingRequestOfferCostOverviewPanel` (cook + admin cook view; admin offer detail passes `storedPrice`), offer chat
component, Call tab, testimonial panel — see [testimonials.md](./testimonials.md), [booking-payment.md](./booking-payment.md),
[assistants.md](./assistants.md).

GraphQL admin offer fields for ops economics: `platformFeePercent*`, `platformFeeCents*`, `paymentProviderFeeCents`,
`stripePaymentIntentUrl`, `stripeSetupIntentUrl`. Radius rows: `estimatedTravelExpensesCents`, `suggestedMenuPriceCents`.

See [admin-shell.md](./admin-shell.md), [booking-offer-chat.md](./booking-offer-chat.md), [booking-offers.md](./booking-offers.md).
