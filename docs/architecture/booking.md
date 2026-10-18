# Booking domain

## Context

peopleeat is a private-chef marketplace. Customers post **booking requests**; cooks in range (or invited) submit **offers**; both sides
negotiate via an offer timeline; after dual acceptance the platform collects payment (Stripe Connect) and later pays the cook. The go-live
product loop needs a complete persistence spine: requests, cook affinity, offers, negotiation events, call slots, and fee/payment columns.

## Decision

### Persistence (implemented)

Postgres / Drizzle tables with project conventions (UUID PKs, `*Cents` money integers, `varchar().$type<>` enums, JSONB payloads in
`src/server/domain/bookingRequest.ts`):

| Table                                            | Role                                                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `BookingRequests`                                | Customer event ask — occasion, `dateTime`, exact venue, message, preferences, discounts, invoice, lifecycle |
| `BookingRequestParticipants`                     | Party line items (`ADULT` \| `DISCOUNTED`) + dietary restrictions                                           |
| `BookingRequestCooks`                            | Cook ↔ request affinity before / without an offer (notify, open, decline, optional AI evaluation)           |
| `BookingRequestOffers`                           | Cook proposal — dual accept flags, fee breakdown, payment, optional configured-menu snapshot                |
| `BookingRequestOfferEvents`                      | Append-only negotiation timeline (“offer chat”) + domain events                                             |
| `CookCallSlotBookings`                           | Discovery-call request / confirm / decline / cancel tied to an offer                                        |
| `Menus.bookingRequestOfferId` (+ `copyOfMenuId`) | Optional offer-scoped **copies** of cook inventory menus                                                    |

**Deferred** relative to go-live:

- Intake-chat tables for `/booking-request/chat` — form path first; see [booking-request-create.md](../features/booking-request-create.md)

Admin hand-over is shipped as close-old + create/upgrade-new (never mutate `cookId` in place), with `ADMIN_HANDED_OVER_CLOSED` /
`ADMIN_HANDED_OVER_TO_COOK` timeline events. Optional `copyChatMessages` hard-copies `*_MESSAGE_SIMPLE` rows onto the new offer (with
prior-cook provenance) — see [admin-booking-requests.md](../features/admin-booking-requests.md) and
[booking-offer-chat.md](../features/booking-offer-chat.md).

Slack thread references (`BookingRequests.references` JSONB with `slackTs` / `slackChannelId`) **are** shipped — see
[slack-notifications.md](../features/slack-notifications.md).

### Location

Only `exactEventAddress` (Places JSONB, same shape as `CookTravelOriginAddress`). No separate approx lat/lng / `locationName` columns.
Cook-facing GraphQL redacts street fields (`addressLine1` / `addressLine2` / street `displayText`) on `CookBookingRequest` always, and on
`CookBookingRequestOfferContext` until that offer is dual-accepted — then the full venue is returned for the request tab. The same
dual-accept gate exposes `invoiceAddress` on `CookBookingRequestOfferContext` (null until checkout stores it).

### Dual acceptance

Nullable booleans on the offer: `null` = pending, `true` = accepted, `false` = declined. Typical create path sets `cookAccepted: true` and
leaves `userAccepted` null. Customer edits can clear cook acceptance back to null. **Statuses are derived** (`bookingRequestStatusDerive` /
`bookingRequestOfferStatusDerive`), not stored.

### One accepted offer

Partial unique index `BookingRequestOffers_oneAccepted_uidx` on `bookingRequestId` where both accept flags are `true`. Also unique
`(bookingRequestId, cookId)` — one offer per cook per request.

### Offer chat ≠ Chat foundation tables

`BookingRequestOfferEvents` remains the negotiation transcript in the DB. Do **not** write offer negotiation into `Chats` / `ChatMessages`
(LLM assistant persistence) — that would pollute assistant replay.

GraphQL **does** project the timeline onto the shared `ChatMessage` wire union:

- `*_MESSAGE_SIMPLE` → `ChatMessageUser` (`author: PublicUser`, `isOwn` by viewer role; optional `reactions` from
  `BookingRequestOfferEventReactions` when present)
- All other event types → `ChatMessageBookingRequestOfferEvent` (`type` + `payload: JSON`)

Exposed as lazy `messages: [ChatMessage!]!` on `UserBookingRequestOffer` / `CookBookingRequestOffer` / `AdminBookingRequestOffer`. Sends go
through role-scoped `bookingRequestOfferChatMessageCreate` mutations (optional `fileUploadIds` → `BookingRequestOfferEventAttachments` →
`FileUploads`; peers download via GET peer-access). Admins may also `bookingRequestOfferChatMessageUpdate` to replace `payload.messageBody`
on any `*_MESSAGE_SIMPLE` event (attachments unchanged; allowed after send is closed). Chat writes use
`bookingRequestOfferChatWritableAssert` (blocks decline or request cancel only — dual-accept stays writable). Negotiation commands keep
`bookingRequestOfferNegotiationAssert` (blocks decline **and** dual-accept). UI `canSend` mirrors that via shared
`bookingRequestOfferChatCanSend(status)` (closed: `USER_DECLINED` / `COOK_DECLINED` / `CANCELED`). Day grouping stays client-side
(`groupMessagesByDate`).

Offer create (`cookBookingRequestOfferCreate` / `adminBookingRequestOfferCreate`) seeds the booking-request message (`adjustedMessage` ??
`originalMessage`, when non-empty) as the first timeline event (`USER_MESSAGE_SIMPLE`, authored as the customer) immediately before
`COOK_CREATED`, so both cook and customer see it as the chat opener. `COOK_CREATED` payload includes `menuPriceCents` and
`totalWithoutDiscountsCentsCustomer`; chat milestones show the customer total (same field on `COOK_CHANGED_PRICE` / `SYSTEM_CHANGED_PRICE`
snapshots). An optional cook `message` on create is then seeded as `COOK_MESSAGE_SIMPLE` (phone numbers rejected via `containsPhoneNumber`;
not written onto the `COOK_CREATED` payload). Older offers missing the request-message seed are healed on first `messages` load. Pool /
customer request-detail UIs also show that request message as a bubble (`CookBookingRequest.message` is the resolved text for cooks;
customers keep `originalMessage`); the cook offer **request** tab does not repeat it.

Product behavior: [booking-offer-chat.md](../features/booking-offer-chat.md).

### Menus on offers

Suggested menus are **optional**. When present, offer create / suggested-menus update **deep-copies** cook inventory menus onto rows with
`Menus.bookingRequestOfferId` set (and `copyOfMenuId` pointing at the source). Inventory `publishedAt` is ignored for offers (drafts are
fine; publish is reserved for a planned public cook-page catalog). Customer course picks freeze into `BookingRequestOffers.configuredMenu`
JSONB so later inventory edits do not rewrite history. Cooks browse/edit those copies under `/profile/menus?scope=offers` and may sync them
back onto the inventory template — see [cook-menus.md](../features/cook-menus.md). Admins may replace an existing snapshot via
`AdminMutation.bookingRequestOfferConfiguredMenuUpdate` (preserves `menuId`). Cooks create offers on
`/profile/booking-request-pool/$bookingRequestId/create` with optional on-the-fly menu/meal create + AI prefill.

### Call slots

Cook **availability** (rules / exceptions) already ships. `CookCallSlotBookings` is the booking row; offer events mirror request / confirm /
decline / cancel. Slot **derivation** (`deriveCookCallSlots` / `cookCallSlotsFindMany`) and role-scoped request / confirm / decline / cancel
commands are implemented. LiveKit rooms (`BookingRequestOfferCallRooms` + participants) support ad-hoc create/join/leave; confirmed slots
link via `videoCallRoomId` when a room opens in the join window. Reminder / complete / empty-room sweep jobs are registered. When
`OBJECT_STORAGE_S3_*` is set, room create starts audio egress and room end enqueues transcript finalize (see
[call-recordings.md](../features/call-recordings.md)). Offer create currently uses **Google Routes driving distance** via
`serverRuntime.places.drivingDistanceKm`, with haversine `geoDistance` as fallback (`travelDistanceKmResolve`). Cook pool list estimates
stay haversine-only (API cost).

### Money & payment

Full fee columns on the offer (`menuPriceCents`, travel, provider fee, platform fees both sides, cook payout, customer totals) plus
`paymentStatus` / `paymentData` / pull & payout timestamps. Customer accept prepares SetupIntent / PaymentIntent / €0 transfer via
`ServerRuntime.stripe`; checkout + webhook finalize; admin-gated cook bank payout after the event (see
[stripe-payment.md](./stripe-payment.md)).

**Pricing contract** (shared `bookingRequestOfferPriceCalculate` — 18% cook / 4% customer platform fee + Stripe-style 1.5%+25¢ gross-up):

| Actor | Editable inputs                                     | Derived                                                               |
| ----- | --------------------------------------------------- | --------------------------------------------------------------------- |
| Cook  | Menu price per person (UI) → `menuPriceCents` total | Travel (distance × cook rate × 2), all fees / payout / customer total |
| Admin | `menuPriceCents` + `travelExpensesCents`            | Same fee snapshot — never free-form fee amounts                       |

Soft price-class guidance (`suggestedOfferAmountCents` / `minOfferAmountCents` / `maxOfferAmountCents` via
`bookingRequestOfferPriceGuidance`) is UX-only on cook/admin offer surfaces. `CookBookingRequest.estimatedCookPayoutCents` is the cook
payout at that suggested per-person price (via `bookingRequestSuggestedCookPayoutCents`) for pool-detail preview. Promo
`minimumTotalAmountCustomerCents` is a **hard** customer-total floor enforced on cook create / price-update.

### GraphQL shape (**implemented** — foundation)

Role-scoped types — no Open|Accepted unions. Customer / cook / admin each get their own request and offer types; shared enums and
participants / costs / configured-menu snapshots stay unprefixed.

1. `UserBookingRequest` / `UserBookingRequestOffer`, `CookBookingRequest` / `CookBookingRequestOffer`, `AdminBookingRequest` /
   `AdminBookingRequestOffer` in `schema.graphqls`
2. Customer offers nest `cook: PublicCook` + `suggestedMenus: [PublicCookMenu!]!`; cook offers keep `suggestedMenus: [CookMenu!]!`; admin
   offers nest `cook: AdminCook`. `PublicCook.user` / `CookBookingRequest.user` use lean `PublicUser` (`display` = first name).
   `AdminBookingRequest` nests `customer: AdminUser` and nullable dual-accepted `cook: AdminCook`; `AdminCook.user: AdminUser`
3. Unread badges are role-scoped: customer offers expose only `userUnreadNotificationCount`; cook offers only `cookUnreadNotificationCount`;
   admin keeps both
4. `publicationStatus` is on `AdminBookingRequest` only — customers do not see it yet (planned feature); cooks never see non-approved
   requests, so `CookBookingRequest` omits it
5. Cook-facing request types expose a single resolved `message` (`adjustedMessage` ?? `originalMessage`, trimmed) — not the raw pair.
   Customer / admin keep `originalMessage` + `adjustedMessage`. Cook-facing `exactEventAddress` redacts street until dual-accept; offer
   context also gates `invoiceAddress` the same way (see Location above)
6. Offer timeline projects onto `messages: [ChatMessage!]!` (`ChatMessageUser` + `ChatMessageBookingRequestOfferEvent`)
7. Derived statuses: `bookingRequestStatusDerive` / `bookingRequestOfferStatusDerive` in `src/server/domain/bookingRequest.ts`
8. `CostBreakdown` with `amountCents` (discounts negative) via `bookingRequestOfferCostBreakdownBuild`
9. Mappers: `toGqlUserBookingRequest*`, `toGqlCookBookingRequest*`, `toGqlAdminBookingRequest*`, plus public cook/user/menu helpers
10. Cook pool + customer list/detail + admin list/detail/offers are wired; admin overview/list/create/detail/**edit**/offer create+edit UI
    live (publication approve on blocked large-group requests); admin ops mutations for request update + offer create/update (menu + travel
    inputs only; fees always recalculated); admin offer detail splits **offer** (people / accept metadata), **costs** (Plattformgewinn, fee
    split/%, payment-provider fee, Stripe PI/SI Dashboard links, dual cost views with stored fees), and **menu**; radius cooks expose
    suggested menu price + travel expenses; cook offer inbox UI live; customer offer cards → dedicated offer page + Stripe checkout;
    chat-tab open resets role-scoped unread counters

Drive UI with `status` + field presence.

## Alternatives considered

| Option                                            | Why rejected / deferred                                              |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| Reuse Chat foundation DB tables for offer threads | Different product semantics; pollutes LLM replay                     |
| Approx location + exact address columns           | Product choice: store exact venue only                               |
| Skip payment columns until charge ships           | Booking without fee/payment shape forces a painful second migration  |
| Require menus on every offer                      | Product allows price-only offers                                     |
| Open \| Accepted cook union as default API        | Over-fit to dialog-era shapes; status enum already encodes lifecycle |
| Intake chat tables now                            | Not needed for go-live; form path first                              |

## Consequences

- The marketplace loop is live: form → cook pool → offer → chat / dual accept → Stripe checkout → admin-gated payout. Form is a multi-step
  wizard with URL draft sync. Auto-approved creates and publication approve email + SSE-notify cooks in radius
  (`bookingRequestCooksNotify`). Admins can later notify / re-notify selected radius cooks via `AdminMutation.bookingRequestCooksNotify`.
- Gift-card / promo FKs on requests are ready; customers apply/clear codes via `UserMutation.bookingRequestDiscountUpdate`, and admins via
  `AdminMutation.bookingRequestDiscountUpdate` (same apply/clear rules).
- `menuEvaluation` / `menuEvaluationLoading` on `BookingRequestCooks` power AI menu ranking + inventory recommendation; see
  [ai-menu-evaluation.md](../features/ai-menu-evaluation.md).
- Agents must treat offer events as booking-domain persistence (DB). GraphQL projects them onto `ChatMessage` for UI; do not migrate into
  `Chats` / LLM replay.
- Deferred product work lives in the booking feature slices — start at [features/booking.md](../features/booking.md). Lifecycle emails
  (create / offer / accept / cancel / payment confirm / pull announcement / offer chat notify) are shipped.

## Key files

- `src/shared/bookingRequestOfferPrice.ts` — fee formula
- `src/shared/bookingRequestOfferPriceGuidance.ts` — soft price-class bounds + promo hard min
- `src/web/components/BookingRequestOfferPriceConfigurationPanel.tsx` — per-person input, banners; also exports readonly
  `BookingRequestOfferCostOverviewPanel`
- `src/server/db/schema.ts` — tables
- `src/server/domain/bookingRequest.ts` — enums, JSONB shapes, status derive
- `src/server/domain/bookingRequestOfferCostBreakdown.ts` — cost tree builder
- `src/server/mappers/toGql{User,Cook,Admin}BookingRequest*.ts` — role-scoped GraphQL mappers
- `src/server/graphql/schema.graphqls` — role-scoped booking types + `PublicUser` / `PublicCook` / `PublicCookMenu*`
- `docs/features/booking.md` — product index + slice links
