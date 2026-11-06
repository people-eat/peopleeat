# Admin feature toggles

Operators turn fixed product capabilities on and off without a deploy. Missing database rows count as off until first write. Per-user
overrides can enable or disable a key for a specific `Users.userId` while the platform default stays unchanged.

## Behavior

### Catalog

Every known feature key is part of the product enum. Admins always see the full list, including keys that have never been written (**ghost**
/ not configured). Ghost rows show as off. Enabling or disabling a ghost creates the database row; later toggles update it.

Keys today:

- AI menu evaluation
- AI booking-request adjusted message (cook-facing rewrite after create; see
  [ai-booking-request-message.md](./ai-booking-request-message.md))
- Cook biography AI writing (Write / Improve with AI; short summary generation stays always on)
- Cook wallet Stripe balance (live Connect balance + recent transactions on `/profile/wallet`)
- Cook analytics (overview KPIs + `/profile/analytics`; see [cook-analytics.md](./cook-analytics.md))
- Cook other profiles (website, Instagram, Google, Take a Chef, and other platforms on the chef profile; admin review stays available)
- Booking request restrictions
- Booking request indoor / outdoor
- Booking request kitchen details
- Offer chat emoji reactions
- Offer participant and venue amendment after accept (cook-gated propose / accept)
- Booking-request edit auto price-adjustment preview (customer headcount `priceImpact`)
- Offer shopping / preparations done (cook mark that locks further customer amendments)
- Offer payment receipts (guest payment receipt and cook payout statement on paid offers)
- Customer assistant
- Cook assistant
- Meal publication
- Menu publication
- Landing booking how-it-works section (muted loops + 60s film on `/` and `/en/`)
- Landing testimonial cards (shared review card on `/` and `/en/` instead of the scrolling quote marquee)
- Partner page partners-explore CTA (“Entdecke mehr unserer Partner” on `/partners/$pathName`)

Calls, scheduling, WhatsApp recipient language, and WhatsApp webhook signature validation stay always on and are not toggles.

### Resolution (global + per-user)

For a given `(userId | null, key)`:

1. If a `FeatureToggleUserOverrides` row exists for that pair → use its `enabled` value (enabled or disabled for that user).
2. Else → use global `FeatureToggles.enabled` (missing global row = off).
3. Anonymous / no `userId` → global only (no override possible).

`Session.activeFeatureToggleKeys` exposes the **effective** keys for the bound user. Server gates that call
`featureToggleIsEnabled(key, serverRuntime, userId)` use the same rule.

### Admin `/admin/feature-toggles`

List shows every key as a shared admin card row with bilingual label, enum key, ghost badge when not persisted, last updated when persisted,
global on/off switch, and a user-plus control to add overrides. Toggling the global switch opens a confirmation that explains what the
feature does and that per-user overrides still win. Existing **user overrides** for a key appear on the card only when at least one is set.
Live updates via admin updates seed-and-subscribe.

Toolbar (client-side, stored in the URL so reload / share / back keep the lens). Defaults omit the key:

- `q`: search by bilingual label or enum key
- `status`: `enabled` / `disabled`
- `config`: `configured` / `not-configured`
- `overrides`: `with-overrides` / `without-overrides`
- `sort`: `key-asc`, `updated-desc`, `overrides-desc`, or `enabled-first` (name A to Z is the omitted default)

The page has no in-body title (admin chrome breadcrumbs identify it). On wide panes the filters sit on the same row as the search field; on
a narrow pane the search takes a full row and the filters wrap underneath.

Per key, operators can:

- see who has an override (name links to the user Feature toggles tab)
- change Enabled for user / Disabled for user / Default (clear)
- open a dialog (user-plus) to search and add a user override (DE UI: **Ausnahme**, not “Override”)

### Admin user detail (per-user overrides)

On `/admin/users/$userId` (**Feature toggles** tab), every catalog key is listed with:

- effective active/inactive state
- global default (read-only context)
- Override badge when a row is set (DE: Ausnahme)
- Control: Default (global) / Enabled for user / Disabled for user

Clearing the override deletes the row so the global default applies again. Upsert/delete publish `adminUpdates` and `userUpdates` for the
target user so their session can refresh effective keys. German UI copy uses **Ausnahme** / **Ausnahmen** instead of “Override”.

### Client and server runtime

Visitors can read currently enabled keys on `Session.activeFeatureToggleKeys` (effective for the session user). Profile and admin shells
mount `FeatureToggleKeysProvider` from that list; admin also sets `FeatureToggleAdminShellProvider` so ops UI stays on by default while
product gates that pass `gateInAdminShell: true` (offer chat reactions) follow the admin’s effective keys. Server code can call
`featureToggleIsEnabled` for commands and jobs (pass `userId` when the acting user matters; omit for global-only / jobs). Product surfaces
that should respect a key still need an explicit gate at the call site.

Wired today:

- **Customer assistant** (`ASSISTANT_CUSTOMER`) — hides the profile assistant trigger + rail; `/profile/assistant` redirects to `/profile`
  when off
- **Cook assistant** (`ASSISTANT_COOK`) — same for cook profile shells
- **Meal publication** (`PUBLICATION_MEALS`) — hides cook draft/published badges, publish/unpublish actions, and status tabs on meal list /
  detail; admin cards keep publication UI; public cook page still filters by `publishedAt` **and** requires an image
- **Menu publication** (`PUBLICATION_MENUS`) — same for menus
- **Booking request restrictions** (`BOOKING_REQUEST_RESTRICTIONS`) — shows the dietary-restrictions wizard step and customer/admin editors;
  create/update strip non-empty restriction values when off for the customer `userId`. Detail views still show stored restrictions. Admin
  shells keep the editor visible for ops (`FeatureToggleAdminShellProvider`, default not `gateInAdminShell`); the server still strips when
  the effective toggle is off
- **Booking request indoor / outdoor** (`BOOKING_REQUEST_SETTING`) — Outdoor / Indoor cards on the form location step, plan details, and
  pre-accept venue edits, with Later as a skip underneath until the picker is ~42rem wide (then Outdoor / Later / Indoor in one row).
  Create/update strip incoming `setting` to null when off. Stored values stay readable for cooks, customers, and admin. Not a new funnel
  step; location `step_completed` records the choice when on
- **Booking request kitchen details** (`BOOKING_REQUEST_KITCHEN_DETAILS`) — skippable kitchen card after send, request-detail editor, and
  attention when still empty on an open request. Create/update strip incoming `kitchenDetails` when off. Stored values and photos stay
  readable. Independent of indoor/outdoor
- **Offer chat emoji reactions** (`BOOKING_REQUEST_OFFER_CHAT_REACTIONS`) — smile control on peer `*_MESSAGE_SIMPLE` bubbles in customer /
  cook **and admin** offer chat; admin shells mount the session toggle provider and gate this key with `gateInAdminShell` (unlike
  publication / restrictions, which stay visible for ops when the end-user rollout is off). Mutation
  `bookingRequestOfferChatMessageReactionUpsert` rejects when off for the acting `userId`
- **Offer amendment** (`BOOKING_REQUEST_OFFER_AMENDMENT`) — post–dual-accept participants and/or venue change (customer propose via
  booking-request edit → cook accept/decline → Stripe delta); see
  [booking-offer-participant-amendment.md](./booking-offer-participant-amendment.md). Customer create / cancel reject when off for the
  acting `userId`; cook accept/decline of an already-pending proposal stay available. Admin shells keep amendment visibility for ops
- **Offer price-impact preview** (`BOOKING_REQUEST_OFFER_PRICE_IMPACT_PREVIEW`) — shows the live auto price-adjustment banner on the
  customer booking-request edit page when guest count changes and offers exist; pauses the `priceImpact` query when off. Admin edit keeps
  the preview (ops shell). Server auto-scale on save is unrelated and stays always on
- **Offer preparations complete** (`BOOKING_REQUEST_OFFER_PREPARATIONS_COMPLETE`) — cook **shopping / preparations done** control that locks
  further customer amendments as a side effect; cook prep-complete rejects when off for the cook `userId`. Already-locked offers still show
  the lock state (and admin clear) when the toggle is off
- **Offer extras** (`BOOKING_REQUEST_OFFER_ADDONS`) — cook extras library, attaching extras on offer create, and the guest picker before
  accept. Admin templates stay available for ops. See [booking-offer-addons.md](./booking-offer-addons.md)
- **Offer payment receipts** (`BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS`) — on a paid offer, a customer payment receipt and a cook payout
  statement. Each side follows that person's effective toggle. Neither document is an invoice. See
  [booking-payment-receipts.md](./booking-payment-receipts.md)
- **Cook biography AI writing** (`COOK_BIOGRAPHY_AI_WRITE`) — shows Write / Improve with AI on the cook chef-profile editor; cook and admin
  suggest mutations reject when off for the **cook** `userId`. Biography **summary** generation (auto job on cook save + admin Generate
  summary) is not toggled and always runs. Admin shells keep the AI write button visible for ops (same as publication / restrictions); the
  server still rejects when the effective toggle is off
- **Cook wallet Stripe balance** (`COOK_WALLET_STRIPE_BALANCE`) — shows live Connect available/pending balance and recent balance
  transactions on `/profile/wallet`; `Cook.stripeWallet` returns null when off for the cook `userId` (no Stripe balance calls)
- **Cook analytics** (`COOK_ANALYTICS`) — shows overview KPIs and `/profile/analytics`; `Cook.analytics` returns null when off for the cook
  `userId`. See [cook-analytics.md](./cook-analytics.md)
- **Cook public profile share** (`COOK_PUBLIC_PROFILE_SHARE`) — shows Share on `/chefs/$cookId` (top bar) and on `/profile/public` Preview;
  missing row stays off. Public detail reads `Session.activeFeatureToggleKeys`; cook Preview uses the profile shell provider. See
  [public-chefs.md](./public-chefs.md) and [cook-profile.md](./cook-profile.md)
- **Cook other profiles** (`COOK_PRESENCE_LINKS`) — shows website, Instagram, Google, Take a Chef, and other platform links on
  `/profile/chef-profile` (view and edit). `Cook.presenceLinks` is null and `presenceLinksReplace` rejects when off for the cook `userId`.
  Admin cook-profile view and edit always show and save the links. Customers never see them. See [cook-profile.md](./cook-profile.md)
- **AI menu evaluation** (`AI_MENU_EVALUATION`) — cook open / refresh / apply gates use the cook `userId`
- **Landing booking how-it-works** (`LANDING_BOOKING_HOW_IT_WORKS`) — shows `SectionBookingHowItWorks` on the home page when on; missing row
  stays off. Public home reads `Session.activeFeatureToggleKeys` (global + signed-in override). See [landing.md](./landing.md)
- **Landing testimonial cards** (`LANDING_TESTIMONIAL_CARDS`) — home testimonials use the shared public review card when on; missing row
  stays off and the scrolling marketing marquee stays. Quotes stay the fixed marketing copy. Public home reads
  `Session.activeFeatureToggleKeys` (global + signed-in override). See [landing.md](./landing.md)
- **Partner page partners explore** (`PARTNER_PAGE_PARTNERS_EXPLORE`) — shows `SectionPartnersExplore` on public partner detail pages when
  on; missing row stays off. Public partner page reads `Session.activeFeatureToggleKeys` (global + signed-in override). Admin partner
  preview keeps the section for ops. See [partners.md](./partners.md)

## Decisions

### Alternatives considered

| Option                                        | Notes                                                         |
| --------------------------------------------- | ------------------------------------------------------------- |
| Free-form string keys + admin create          | Easy typos; no compile-time catalog                           |
| Percentage / A-B activity levels              | Extra complexity; we only need on/off plus per-user overrides |
| Seed all keys on migrate                      | Ghost merge keeps defaults clear without seed noise           |
| Fixed GraphQL enum + create-on-write (chosen) | Keys require a code change anyway; admin always sees all keys |
| Allowlist-only when global off                | Cannot disable a user when global is on                       |
| Global + per-user overrides (chosen)          | Early access and exclusions without percentage rollout        |

### Chosen

Boolean `enabled` rows keyed by a shared `FeatureToggleKey` enum. Admin list merges the enum with the table. First write upserts. Public
session exposes effective active keys. Per-user overrides are keyed by `(userId, featureToggleKey)` and win over the global default when
present.

## Ideas

- Percentage rollout or sticky A/B bucketing if gradual exposure is needed later.
- ~~Wire remaining key: AI menu evaluation~~ — wired; see [ai-menu-evaluation.md](./ai-menu-evaluation.md).
- ~~Override counts on the global feature-toggles page~~ — shipped with per-key override list + add/clear.

## Implementation

- Shared keys: `src/shared/featureToggle.ts`
- Schema: `FeatureToggles` (`featureToggleKey`, `enabled`, `createdAt`, `updatedAt`); migration `drizzle/0003_sturdy_captain_stacy.sql`
- Schema: `FeatureToggleUserOverrides` (`userId`, `featureToggleKey`, `enabled`, `createdAt`, `updatedAt`); migration
  `drizzle/0009_fixed_morbius.sql`
- GraphQL: `FeatureToggleKey` enum; `AdminFeatureToggle` (+ `userOverrides`); `AdminFeatureToggleUserOverride` (`userId`, `user`);
  `Admin.featureToggles`; `AdminUser.featureToggleOverrides`; `AdminMutation.featureToggleUpsert` / `featureToggleUserOverrideUpsert` /
  `featureToggleUserOverrideDelete`; `Session.activeFeatureToggleKeys`
- Server: `adminFeatureToggleFindMany` (merge), `adminFeatureToggleUpsert`, `adminFeatureToggleUserOverrideFindMany`,
  `adminFeatureToggleUserOverrideFindManyByKey`, `adminFeatureToggleUserOverrideUpsert`, `adminFeatureToggleUserOverrideDelete`,
  `sessionFeatureToggleFindActive` (user-aware), `featureToggleIsEnabled` (user-aware), `toGqlAdminFeatureToggle`,
  `toGqlAdminFeatureToggleUserOverride`
- Admin UI: `AdminFeatureTogglesPage` (global + per-key overrides, enable/disable confirm with feature description, list filters in URL `q`
  / `status` / `config` / `overrides` / `sort`); `AdminUserFeatureTogglesSection` on user Feature toggles tab; labels/descriptions/helpers
  in `adminFeatureToggles.ts`

See [admin-shell.md](./admin-shell.md).
