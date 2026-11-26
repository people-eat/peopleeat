# Cook profile

Cooks manage identity, travel, public visibility, payouts, and discovery-call scheduling from the profile shell.

## Behavior

Signed-in cooks manage these areas under `/profile/*`:

1. **Overview** (`/profile`) has two lanes: **Attention** (approval pending, Stripe finances reset when Connect needs updated details,
   unread offer-chat messages deep-linking the busiest offer with `?tab=chat`, upcoming discovery calls in the next 14 days) and **Getting
   started** (incomplete setup only — invoice address first for every cook until saved, finances for `EMPTY` / `PREPARED`, travel origin,
   profile picture, chef bio/cuisine/philosophy, first meal, first menu, default offer note, first offer). When `COOK_ANALYTICS` is on and
   the cook already has marketplace or discovery activity, a compact past-month **Analytics** strip appears (profile views, time to open,
   offers, conversion) with a link to `/profile/analytics` — see [cook-analytics.md](./cook-analytics.md). Brand-new cooks see no analytics
   zeros. `ACTIVE_WAS_RESET` is Attention (not Getting started). Completed steps disappear. When both lanes are empty, a calm “you’re all
   set” note points to the sidebar.
2. **Chef page** (`/profile/chef-profile`) is the cook’s shop window for `/chefs/<pathName>`. Line tabs (URL `?tab=`, default **Overview**
   with the key omitted; breadcrumbs carry the page name, there is no in-pane title): **Overview** holds completeness alerts and a
   guest-identity readout (photo, name guests see, cuisine/philosophy pills, city linking to Travel settings, extra picture, meals/menus
   linking to those libraries, biography summary) plus the private default offer note; **Public card** is the listing-card preview at
   natural width (`PublicCookCard`, non-interactive); **Public page** is a framed guest WYSIWYG (`ChefPagePreviewFrame` with visitor
   `Header` + `ChefProfileView` + `Footer`). The frame chrome shows the **Live** / **Hidden** / **Waiting for team approval** badge next to
   the public URL, plus Share / Copy / Open (Share gated by `COOK_PUBLIC_PROFILE_SHARE`). The framed page shows saved identity plus
   published meals that have images and published complete menus that have a meal picture, even when customers would not see the live page
   yet. Display name is stage name or first name (never last name). Preview uses `Cook.rating` for the star row; testimonials stay omitted
   (no cook-scoped public testimonial list on this page yet). Share / Copy / Open are gated on visible + admin-approved. `/profile/public`
   (including `?tab=manage`) redirects here; leftover `?tab=preview` lands on the Public page tab. **Edit** has no in-pane title
   (breadcrumbs carry the page name): square profile picture sits beside the visibility switch (confirm dialog before save) from `sm` up,
   then landscape About additional picture via `CookLogoEditor` / 16:9 `logo` crop / `CookUpdate.logoFileUploadId` immediate save,
   biography, cuisine, public URL when gated, then **Private to you and the team** (default offer note; Other profiles when gated). Without
   an additional picture the public About column shows the peopleeat benefits fallback — [public-chefs.md](./public-chefs.md). Published
   meals without an image, and published menus that are incomplete or have no dish picture, are omitted from the preview and called out with
   warning banners when `PUBLICATION_MEALS` / `PUBLICATION_MENUS` are on (menu banner also requires `COOK_PUBLIC_PROFILE_MENUS`). A
   photo/biography readiness alert links to Overview setup. When `COOK_PUBLIC_PROFILE_PATH_NAME` is on, edit includes **Public URL**
   (`/chefs/<pathName>` with slug input and live availability). Changing the slug keeps the old address as a redirect; the last name in the
   URL is public even though guests see first name or stage name. When the toggle is off, the section is hidden and `cookUpdate` rejects
   `pathName`. Public `/chefs/<pathName>` still works. The edit footer is dirty-gated (Save only when the form is dirty; otherwise **Back to
   chef page**). The default offer note has three states: **not set** (`null`, Getting started item; offer create still uses the peopleeat
   greeting), **empty** (start blank each offer), or **custom text** (prefill). Saving chef page without changing that section leaves `null`
   as `null`. Profile picture can be changed or removed there (same crop/upload flow as account —
   [profile-pictures.md](./profile-pictures.md)). When `COOK_BIOGRAPHY_AI_WRITE` is on, cooks can **Write with AI** / **Improve with AI**
   (spinner while generating): the suggestion opens a **side-by-side review** (textarea hidden while reviewing); **Accept** fills the
   biography field so the cook can edit further before Save; **Discard** leaves the form unchanged. When the toggle is off, the button is
   hidden and the suggest mutation rejects. Biography summary is view-only for cooks and regenerates automatically in the background
   (best-effort job) whenever they save a non-empty biography — **always**, independent of the AI-write toggle. A biography save **stays on
   the edit page** (toast + summary skeleton via `Cook.biographySummaryGenerating`); cuisine/philosophy-only saves still navigate back to
   the shop-window view. Clearing the biography clears the summary and cancels any pending summary job. Public surfaces keep showing the
   last good summary until the job finishes. **Contact is not allowed in the biography**: websites, Instagram, emails, and phone numbers are
   stripped while typing (live guest preview, same deterministic detection style as offer-chat phone blocking) and again on every write. The
   summary job also asks the LLM to remove remaining contact, including phone digits written as words, and writes that cleaned biography
   back with the summary. Admins edit both fields and regenerate the summary on demand; admin enhance uses the same review/accept-into-form
   pattern (no auto summary) and is gated by the same toggle on the server — see [admin-users.md](./admin-users.md) and
   [admin-feature-toggles.md](./admin-feature-toggles.md). When `COOK_PRESENCE_LINKS` is on, the edit page includes **Other profiles**
   (website, Instagram, Google profile, Take a Chef, and up to five more: Yhangry, Cozymeal, Eatwith, ChefMaison, or a named platform). The
   copy says the peopleeat team uses the links to review the profile and customers never see them. Blank fields clear the document. The cook
   mutation rejects when the toggle is off for that cook. Admins always see and edit the same links on the user cook-profile tab, including
   while the toggle is off. Nothing is copied onto the public chef page.
3. **Travel settings** (`/profile/travel`) shows travel origin, max distance, and €/km expenses, plus a map centered on the origin with the
   max-distance radius drawn as a circle so cooks can see which area their booking-request pool covers. An info `StatusAlert` explains that
   radius traffic lands in the pool and links there with **Go to booking request pool**. **Edit** opens the travel form and updates the
   circle live when origin or max distance changes. Max distance is a select of **50 / 100 / 150 / 200 km** (default **100** on create /
   sign-up); if a cook already has a non-standard saved km (legacy import), that value stays visible in the select until they pick a
   standard choice. Customers only see the **city** from the travel origin — never the full street address or the pin. Overview and the
   booking request pool deep-link here when travel origin is missing.
4. **Finances** (`/profile/finances`) is the Stripe Connect onboarding surface and the place cooks save their **invoice / billing address**
   (separate from travel origin; used later for peopleeat→cook invoices). When `Cook.invoiceAddress` is null, a warning `StatusAlert` asks
   them to add it (stacked in the same `gap-4` alert column as Stripe status banners); when set, the page shows the address with Edit. Both
   open an editor that saves via `CookUpdate.invoiceAddress` (full-page sheet below `md`, two-column dialog from `md` up), with Places
   autocomplete and a one-click **Use travel origin** fill when a travel origin exists. Getting started links here for `INVOICE_ADDRESS`.
   Stripe CTAs still require admin approval. Coarse Stripe status uses info / warning / success alerts — see
   [status-messaging.md](../styles/status-messaging.md). Connect flags (`stripeAccountActive` / `stripeAccountActiveWasReset`) also update
   from the Stripe `account.updated` webhook via `cookStripeAccountStatusApply`, so status can change before the cook opens finances. When a
   Connect account exists, the page also loads a **live** Stripe requirements snapshot (`Cook.stripeAccountDetails`) and shows a short
   checklist of what’s still needed (identity verification, bank account, pending review, overdue details). When setup is complete, an info
   CTA points cooks to the booking request pool to make offers. When `COOK_WALLET_STRIPE_BALANCE` is on, it also loads **live Connect
   balance + recent balance transactions** (`Cook.stripeWallet`: available/pending EUR cents and up to 20 newest movements) so cooks see
   money without opening the Express dashboard. Bank payouts remain admin-gated after the event — the page copy says so. Those live Stripe
   fields are requested only on the finances page query (and refetched after status sync), never on `userUpdates`. On **first** Express
   account create, onboarding prefills phone and date of birth from the user profile and address from travel origin when present (Stripe
   still asks the cook to confirm; bank/ID docs are never prefilled). Webhook endpoint + event catalog:
   [stripe-payment.md](../architecture/stripe-payment.md#webhooks--dashboard-setup).
5. **Calls** (`/profile/calls`) toggles call scheduling and duration, weekly windows, and date exceptions — see
   [cook-call-availability.md](./cook-call-availability.md). Live call booking happens from the offer Call tab, not here.
6. Admins manage cooks on the user admin surface: approve/revoke with a confirm dialog (approve sends a transactional email with a CTA to
   `/profile`; revoke does not email), toggle public visibility with a confirm dialog, edit stage name / About logo / travel / biography /
   cuisine catalogs / default offer note, view live Stripe finances on the cook-profile tab (requirements + balance/transactions, not gated
   by `COOK_WALLET_STRIPE_BALANCE`), and create draft meals/menus. See [admin-users.md](./admin-users.md).

**Membership:** new cooks can sign up on `/chef-sign-up` (account + cook in one step) or existing customers can upgrade. Create requires
travel origin, expenses, and max distance; biography fields are optional and filled later. Signed-in cooks who open `/chef-sign-up` redirect
to `/profile`.

### Finances return and refresh

| URL hint       | Behavior                                                               |
| -------------- | ---------------------------------------------------------------------- |
| (none)         | Status + primary CTA                                                   |
| Stripe return  | Sync payout status once, strip the param, toast                        |
| Stripe refresh | Start onboarding once to mint a new account link, then full navigation |

Return and refresh URLs are distinct. Status sync alone does not replace an expired onboarding link.

## Decisions

### Alternatives considered

| Option                             | Notes                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| JSON payout-methods array          | Rejected — fragile vs flat Connect account columns                                                               |
| SSR mutate on every finances visit | Rejected — re-fires on every load                                                                                |
| Same URL for return and refresh    | Rejected — refresh must mint a new account link                                                                  |
| Denormalized city / coordinates    | Rejected — public city derives from travel origin, with import-preserved city fallback when origin city is empty |
| Free-text cuisine / philosophy     | Rejected — fixed catalogs via comboboxes                                                                         |

### Chosen

Profile, travel, call, and flat Stripe columns on the cook record; cook updates and dedicated Stripe mutations; Places optional for address
suggestions and driving distance; finances page owns one-shot return/refresh handlers only (never from layout or SSR).

## Ideas

- On public profile, show when the cook is featured on city or partner landing pages.
- Cook self-serve UI to edit `stageName` (API + public display already support it; admins can edit on user detail).

### Cook-to-cook invite (planned)

Approved cooks share a personal invite link from the profile shell and see each invitee’s progress (registered → approved → first offer →
first event). When the frozen program’s unlock milestone is reached (v1: first event), the inviter earns the promised reward. Attribution
uses `invitedByCookId` plus a discriminated JSON freeze on the invitee cook row. Full product options and chosen MVP:
[cook-invite.md](./cook-invite.md).

### Cook scrape on sign-up (planned)

Speed up chef onboarding by optionally importing public profile material during `/chef-sign-up` (or the first profile visit).

Target behavior:

1. Cook pastes a URL to an existing public presence (personal site, portfolio, blog, or similar).
2. peopleeat fetches publicly available text and images and suggests biography, cuisine tags, and draft meal ideas for review.
3. Nothing is saved until the cook confirms; suggestions are editable before write.
4. Ops can disable the path with a feature toggle if scrapes become unreliable or abusive.

Not in scope for the first cut: logging into third-party accounts, private social graphs, or overwriting an already-filled profile without
confirm.

### Cook profile review overview

Give cooks a calm overview of how customers have rated them: average stars, review count, and recent published customer testimonials,
surfaced from the cook home / overview (or a dedicated profile entry) rather than only on the public chef page. Low-star or still-pending
reviews stay out of the cook-facing summary until published, matching public rules — see [testimonials.md](./testimonials.md).

## Implementation

- Analytics overview strip: `Cook.analytics` on `ProfilePage` (past month); full page in [cook-analytics.md](./cook-analytics.md)
- Schema: `Cooks` in `src/server/db/schema.ts` (`logoFileUploadId` → `FileUploads`; optional `stageName` public display name; unique
  `pathName` + `previousPathNames` for public chef URLs; `lastModifiedAt` bumped on cook-row writes; import-preserved `legacyCityName` /
  `legacyLatitude` / `legacyLongitude` — `legacyCityName` falls back for public cook city when exact origin city is empty; lat/lng stay
  storage-only); domain helpers `src/server/domain/cook.ts`; slug helpers `src/shared/cookPathName.ts` / `src/server/utils/cookPathName.ts`
- Public URL: `Cook.pathName` / `PublicCook.pathName` / `AdminCook.pathName`; `previousPathNames` on cook/admin only; optional
  `CookUpdate.pathName` (cook gated by `COOK_PUBLIC_PROFILE_PATH_NAME`, admin always). UI `CookPathNameFields` on chef-page edit (toggle)
  and admin cook-profile (always); the shop-window view shows the guest URL in `ChefPagePreviewFrame`. Live availability:
  `Cook.pathNameAvailable` / `Admin.cookPathNameAvailable`
- Stage name: `Cook.stageName` / `PublicCook.stageName` / `AdminCook.stageName`; `CookUpdate.stageName` (null / blank clears). Public
  `PublicCook.user.display` prefers a non-empty stage name over first name.
- Additional picture (API: logo): `Cook.logo` / `PublicCook.logo` (`FileUpload`); `CookUpdate.logoFileUploadId` (null clears); public GET
  when referenced as current cook picture; UI `CookLogoEditor` on `/profile/chef-profile/edit` (copy: Zusätzliches Bild / Additional
  picture) + `CookAboutBenefitsFallback` on About when unset; crop `IMAGE_CROP_ASPECT.logo` = 16/9
- Private review links: `Cooks.presenceLinks` JSON (`src/shared/cookPresenceLinks.ts`); `Cook.presenceLinks` is null when
  `COOK_PRESENCE_LINKS` is off; `AdminCook.presenceLinks` is always loaded; `CookMutation.presenceLinksReplace` /
  `AdminMutation.cookPresenceLinksReplace`; UI `CookPresenceLinksFields` on chef-page edit and admin cook profile. Not on `PublicCook`
- Default offer note: `Cooks.defaultOfferMessage` (`text`, nullable). `null` = not configured (onboarding `DEFAULT_OFFER_MESSAGE` + static
  greeting on create); `''` = start blank each offer; non-empty = prefill. `Cook.defaultOfferMessage` / `AdminCook.defaultOfferMessage` /
  `CookUpdate.defaultOfferMessage` (omit = no change; empty string is stored; GraphQL `null` is ignored). Not on `PublicCook`. UI
  `CookDefaultOfferMessageFields` on chef-page edit. Phone numbers rejected; max 2000 chars; `textNormalizeProse`
- Invoice / billing address: `Cooks.invoiceAddress` JSON (`GiftCardInvoiceAddress` shape); `Cook.invoiceAddress` /
  `AdminCook.invoiceAddress`; `CookUpdate.invoiceAddress` (omit = no change; normalized via `invoiceAddressNormalize`). Not on `PublicCook`.
  Onboarding `INVOICE_ADDRESS` while null (all cooks). Finances UI: warning `StatusAlert` + `CookInvoiceAddressDialog`
- Catalogs: `src/shared/cookProfile.ts` — validated in `cookUpdate`
- Display pills: `CookProfileTags` / `CookProfileTag` in `src/web/components/CookProfileTags.tsx` — shared muted chips for cuisine style +
  cooking philosophy on public/hero/offer/featured surfaces and the chef-page listing-card preview (not `Badge secondary`, which is
  white-on-card)
- Places: `src/server/places/` — Text Search + Routes driving km for offer travel; env `GOOGLE_PLACES_API_KEY`,
  `Session.locationSuggestions`
- Booking travel: `travelDistanceKmResolve` — Routes preferred, haversine fallback; stamped on `BookingRequestCooks` at first open; customer
  edit previews per-offer delta via travel impact; origin / venue edits clear the stamp
- Biography contact policy: shared `cookBiographyContactContains` / `cookBiographyContactStrip` / `cookBiographyNormalize` in
  `src/shared/cookBiographyContact.ts`. Live preview: `CookBiographyContactNotice` on cook + admin chef-profile edit. Writes: `cookUpdate`,
  `adminCookUpdate`, `cookCreatePayloadBuild`. Public reads: `toGqlPublicCook` and `ChefProfileView`. Summary LLM returns cleaned
  `biography` + `biographySummary`; the job persists both.
- Commands: `cookUpdate` (queues `cook-biography-summary-generate` on biography save; does not await the LLM), `cookBiographySuggest` (gated
  by `COOK_BIOGRAPHY_AI_WRITE`), `cookBiographySummaryGenerate`, `cookBiographySuggestGenerate`, `cookStripeOnboardingStart`,
  `cookStripeStatusSync` (calls shared `cookStripeAccountStatusApply`), `cookStripeDashboardUrlCreate`, `adminCookApprovalUpdate`,
  `adminCookUpdate` (manual `biographySummary`, no auto AI), `adminCookBiographySuggest` (same toggle), `adminCookBiographySummarySuggest`
  (always available), `adminCookMealCreate`, `adminCookMenuCreate`, `userCookCreate`, `userCreate` (optional nested cook); approval email
  via `adminCookApprovalUpdateEmailSend`; Connect webhook sync via `stripeWebhookApply` → `cookStripeAccountStatusApply`
- Biography summary job: `cookBiographySummaryGenerate` handler; schedule helpers in `cookBiographySummaryGenerateSchedule` match pending
  work by payload `{ cookId }` (states `created` | `retry` | `active`); GraphQL `Cook.biographySummaryGenerating` /
  `AdminCook.biographySummaryGenerating` — see [jobs.md](../architecture/jobs.md)
- UI: `BiographySuggestionReview` for cook + admin enhance accept-into-form / discard; `CookBiographyContactNotice` live guest preview on
  edit; summary skeleton on chef-page edit when generating; shop-window preview via `ChefPagePreviewFrame`
- AI kinds: `COOK_BIOGRAPHY_SUGGESTION`, `COOK_BIOGRAPHY_SUMMARY` — dedicated models `cookBiographySuggestModel` /
  `cookBiographySummaryModel` — see [ai-generations.md](../architecture/ai-generations.md)
- Finances live details: `Cook.stripeAccountDetails` → `cookStripeAccountDetailsFindOne` → `stripe.accountRequirementsFindOne` (category
  buckets, not raw Stripe keys); `Cook.stripeWallet` → `cookStripeWalletFindOne` (gated by `COOK_WALLET_STRIPE_BALANCE`) →
  `stripe.accountBalanceFindOne` + `stripe.accountBalanceTransactionsFindMany` (EUR cents + mapped transaction kinds, not raw Stripe type
  strings)
- Chef sign-up: `/chef-sign-up` — one-shot create or upgrade form with shared travel fields
- Profile UI: chef page view (shop-window preview + visibility) / edit, travel view/edit, finances, calls, overview Attention + Getting
  started on cook home (server `Cook.attention` / `Cook.onboardingSteps`, routed by `profilePageCookOverview`; see
  [attention.md](../architecture/attention.md)). `/profile/public` redirects to `/profile/chef-profile` (`?tab=preview` → Public page tab).
- Travel radius map: `CookTravelRadiusMap` on `/profile/travel` + live preview on `/profile/travel/edit` (MapLibre + OpenFreeMap Positron,
  same stack as [admin-map.md](./admin-map.md)); circle via shared `mapCirclePolygon` in `src/web/utils/mapCirclePolygon.ts` (admin
  `adminMapCirclePolygon` re-exports it). Shown only when origin lat/lng are set; `null`/≤0 radius paints the pin only. The view page uses
  the standard pinned-footer content scroller (`content-start` grid, not a fill-height nested pane). MapLibre mounts on the sized box itself
  (`min-h-[50vh]`); a nested `absolute inset-0` child is restyled to `position: relative` and collapses. `scrollZoom` is off so wheel events
  scroll the shell, not the map.
- Travel distance select: shared `cookTravelDistanceSelectOptions` / `cookTravelDistanceSelectValue` in `src/shared/cookTravelDistance.ts`
  (50/100/150/200 + current legacy km when needed). Used by `CookCreateFields`, chef sign-up, cook travel edit, and admin cook-profile edit;
  `SelectValue` children render `{km} km` so the trigger is never blank when the value is set. `CookCreateFields` copy is
  `public.chefSignUp.*` (not `profileCook`) so `/chef-sign-up` works with the public catalog only.
- Cook GraphQL: `mealsCounts` / `menusCounts` (`CookMealCriterion` / `CookMenuCriterion`);
  `callSlotBookings(criterion: CookCallSlotBookingCriterion)` for status + `startAt` window
- Admin: pending-approval queue on `/admin`; cook-profile tab (read-only + approval/visibility; edit at
  `/admin/users/<userId>/cook-profile/edit`); meals/menus create on user detail; users list unapproved filter

See [cook-shell.md](./cook-shell.md), [admin-users.md](./admin-users.md), [stripe-payment.md](../architecture/stripe-payment.md).
