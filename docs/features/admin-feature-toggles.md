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
- Booking request restrictions
- Offer chat emoji reactions
- Offer participant and venue amendment after accept (cook-gated propose / accept)
- Offer shopping / preparations done (cook mark that locks further customer amendments)
- Customer assistant
- Cook assistant
- Meal publication
- Menu publication
- WhatsApp English templates (when off, EN recipients get DE Meta template language codes)

Calls, scheduling, and WhatsApp webhook signature validation stay always on and are not toggles.

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

Toolbar (client-side):

- search by bilingual label or enum key
- filter by status (enabled / disabled), configuration (configured / not configured), and whether overrides exist
- sort by name, key, recently updated, most overrides, or enabled first

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
- **Offer chat emoji reactions** (`BOOKING_REQUEST_OFFER_CHAT_REACTIONS`) — smile control on peer `*_MESSAGE_SIMPLE` bubbles in customer /
  cook **and admin** offer chat; admin shells mount the session toggle provider and gate this key with `gateInAdminShell` (unlike
  publication / restrictions, which stay visible for ops when the end-user rollout is off). Mutation
  `bookingRequestOfferChatMessageReactionUpsert` rejects when off for the acting `userId`
- **Offer amendment** (`BOOKING_REQUEST_OFFER_AMENDMENT`) — post–dual-accept participants and/or venue change (customer propose via
  booking-request edit → cook accept/decline → Stripe delta); see
  [booking-offer-participant-amendment.md](./booking-offer-participant-amendment.md). Customer create / cancel reject when off for the
  acting `userId`; cook accept/decline of an already-pending proposal stay available. Admin shells keep amendment visibility for ops
- **Offer preparations complete** (`BOOKING_REQUEST_OFFER_PREPARATIONS_COMPLETE`) — cook **shopping / preparations done** control that locks
  further customer amendments as a side effect; cook prep-complete rejects when off for the cook `userId`. Already-locked offers still show
  the lock state (and admin clear) when the toggle is off
- **Cook biography AI writing** (`COOK_BIOGRAPHY_AI_WRITE`) — shows Write / Improve with AI on the cook chef-profile editor; cook and admin
  suggest mutations reject when off for the **cook** `userId`. Biography **summary** generation (auto job on cook save + admin Generate
  summary) is not toggled and always runs. Admin shells keep the AI write button visible for ops (same as publication / restrictions); the
  server still rejects when the effective toggle is off
- **Cook wallet Stripe balance** (`COOK_WALLET_STRIPE_BALANCE`) — shows live Connect available/pending balance and recent balance
  transactions on `/profile/wallet`; `Cook.stripeWallet` returns null when off for the cook `userId` (no Stripe balance calls)
- **AI menu evaluation** (`AI_MENU_EVALUATION`) — cook open / refresh / apply gates use the cook `userId`
- **WhatsApp English templates** (`WHATSAPP_ENGLISH_TEMPLATES`) — when off (default until approved EN templates exist), lifecycle template
  sends use Meta language `de` even when the recipient locale is `en`; when on, EN locale maps to Meta language `en`

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
  `Admin.featureToggles`; `AdminUser.featureToggleOverrides`; `AdminMutation.featureToggleUpdate` / `featureToggleUserOverrideUpsert` /
  `featureToggleUserOverrideDelete`; `Session.activeFeatureToggleKeys`
- Server: `adminFeatureToggleFindMany` (merge), `adminFeatureToggleUpdate` (upsert), `adminFeatureToggleUserOverrideFindMany`,
  `adminFeatureToggleUserOverrideFindManyByKey`, `adminFeatureToggleUserOverrideUpsert`, `adminFeatureToggleUserOverrideDelete`,
  `sessionFeatureToggleFindActive` (user-aware), `featureToggleIsEnabled` (user-aware), `toGqlAdminFeatureToggle`,
  `toGqlAdminFeatureToggleUserOverride`
- Admin UI: `AdminFeatureTogglesPage` (global + per-key overrides, enable/disable confirm with feature description);
  `AdminUserFeatureTogglesSection` on user Feature toggles tab; labels/descriptions/helpers in `adminFeatureToggles.ts`

See [admin-shell.md](./admin-shell.md).
