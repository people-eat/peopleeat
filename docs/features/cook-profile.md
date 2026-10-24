# Cook profile

Cooks manage identity, travel, public visibility, payouts, and discovery-call scheduling from the profile shell.

## Behavior

Signed-in cooks manage these areas under `/profile/*`:

1. **Overview** (`/profile`) has two lanes: **Attention** (approval pending, Stripe wallet reset when Connect needs updated details, unread
   offer-chat messages deep-linking the busiest offer with `?tab=chat`, upcoming discovery calls in the next 14 days) and **Getting
   started** (incomplete setup only — wallet for `EMPTY` / `PREPARED`, travel origin, profile picture, chef bio/cuisine/philosophy, first
   meal, first menu, first offer). When `COOK_ANALYTICS` is on and the cook already has marketplace or discovery activity, a compact
   past-month **Analytics** strip appears (profile views, time to open, offers, conversion) with a link to `/profile/analytics` — see
   [cook-analytics.md](./cook-analytics.md). Brand-new cooks see no analytics zeros. `ACTIVE_WAS_RESET` is Attention (not Getting started).
   Completed steps disappear. When both lanes are empty, a calm “you’re all set” note points to the sidebar.
2. **Chef profile** (`/profile/chef-profile`) is a read-only view of biography, biography summary, and cuisine style / cooking philosophy as
   the shared `CookProfileTags` pills. **Edit** opens the form with a dirty-gated footer (Save only when the form is dirty; otherwise **Back
   to profile**). Profile picture can be changed or removed there (same crop/upload flow as account —
   [profile-pictures.md](./profile-pictures.md)). When `COOK_BIOGRAPHY_AI_WRITE` is on, cooks can **Write with AI** / **Improve with AI**
   (spinner while generating): the suggestion opens a **side-by-side review** (textarea hidden while reviewing); **Accept** fills the
   biography field so the cook can edit further before Save; **Discard** leaves the form unchanged. When the toggle is off, the button is
   hidden and the suggest mutation rejects. Biography summary is view-only for cooks and regenerates automatically in the background
   (best-effort job) whenever they save a non-empty biography — **always**, independent of the AI-write toggle. A biography save **stays on
   the edit page** (toast + summary skeleton via `Cook.biographySummaryGenerating`); cuisine/philosophy-only saves still navigate back to
   the read-only view. Clearing the biography clears the summary and cancels any pending summary job. Public surfaces keep showing the last
   good summary until the job finishes. Admins edit both fields and regenerate the summary on demand; admin enhance uses the same
   review/accept-into-form pattern (no auto summary) and is gated by the same toggle on the server — see [admin-users.md](./admin-users.md)
   and [admin-feature-toggles.md](./admin-feature-toggles.md).
3. **Travel settings** (`/profile/travel`) shows travel origin, max distance, and €/km expenses. **Edit** opens the travel form. Customers
   only see the **city** from the travel origin — never the full street address. Overview and the booking request pool deep-link here when
   travel origin is missing.
4. **Public profile** (`/profile/public`) has two tabs: **Preview** (default) and **Manage** (`?tab=manage`). Preview is a full-height
   customer WYSIWYG: static `PublicCookCard` (same column width as the public listing grid) plus detail preview of the saved profile and
   published meals that have images — even when customers would not see the page yet — with Copy link / Open when live. Manage controls
   public visibility (`isVisible` with a confirm dialog before save) and the landscape About additional picture (`CookLogoEditor`; 16:9
   `logo` crop; `CookUpdate.logoFileUploadId` immediate save; without a picture the public About column shows the peopleeat benefits
   fallback — [public-chefs.md](./public-chefs.md)). Published meals without an image are omitted from the preview and called out on Manage
   with a warning banner (count badge on the Manage tab). Both previews use `Cook.rating` for the star row; the testimonials section stays
   omitted (no cook-scoped public testimonial list on this page yet). Share link to `/chefs/$cookId` only when visible and admin-approved.
5. **Wallet** (`/profile/wallet`) is the Stripe Connect onboarding surface. CTAs require admin approval. Coarse status uses info / warning /
   success alerts — see [status-messaging.md](../styles/status-messaging.md). Connect flags (`stripeAccountActive` /
   `stripeAccountActiveWasReset`) also update from the Stripe `account.updated` webhook via `cookStripeAccountStatusApply`, so status can
   change before the cook opens the wallet. When a Connect account exists, the page also loads a **live** Stripe requirements snapshot
   (`Cook.stripeAccountDetails`) and shows a short checklist of what’s still needed (identity verification, bank account, pending review,
   overdue details). When setup is complete, an info CTA points cooks to the booking request pool to make offers. When
   `COOK_WALLET_STRIPE_BALANCE` is on, it also loads **live Connect balance + recent balance transactions** (`Cook.stripeWallet`:
   available/pending EUR cents and up to 20 newest movements) so cooks see money without opening the Express dashboard. Bank payouts remain
   admin-gated after the event — the page copy says so. Those live Stripe fields are requested only on the wallet page query (and refetched
   after status sync), never on `userUpdates`. On **first** Express account create, onboarding prefills phone and date of birth from the
   user profile and address from travel origin when present (Stripe still asks the cook to confirm; bank/ID docs are never prefilled).
   Webhook endpoint + event catalog: [stripe-payment.md](../architecture/stripe-payment.md#webhooks--dashboard-setup).
6. **Calls** (`/profile/calls`) toggles call scheduling and duration, weekly windows, and date exceptions — see
   [cook-call-availability.md](./cook-call-availability.md). Live call booking happens from the offer Call tab, not here.
7. Admins manage cooks on the user admin surface: approve/revoke with a confirm dialog (approve sends a transactional email with a CTA to
   `/profile`; revoke does not email), toggle public visibility with a confirm dialog, edit stage name / About logo / travel / biography /
   cuisine catalogs, view live Stripe finances on the cook-profile tab (requirements + balance/transactions, not gated by
   `COOK_WALLET_STRIPE_BALANCE`), and create draft meals/menus. See [admin-users.md](./admin-users.md).

**Membership:** new cooks can sign up on `/chef-sign-up` (account + cook in one step) or existing customers can upgrade. Create requires
travel origin, expenses, and max distance; biography fields are optional and filled later. Signed-in cooks who open `/chef-sign-up` redirect
to `/profile`.

### Wallet return and refresh

| URL hint       | Behavior                                                               |
| -------------- | ---------------------------------------------------------------------- |
| (none)         | Status + primary CTA                                                   |
| Stripe return  | Sync payout status once, strip the param, toast                        |
| Stripe refresh | Start onboarding once to mint a new account link, then full navigation |

Return and refresh URLs are distinct. Status sync alone does not replace an expired onboarding link.

## Decisions

### Alternatives considered

| Option                           | Notes                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| JSON payout-methods array        | Rejected — fragile vs flat Connect account columns                                                               |
| SSR mutate on every wallet visit | Rejected — re-fires on every load                                                                                |
| Same URL for return and refresh  | Rejected — refresh must mint a new account link                                                                  |
| Denormalized city / coordinates  | Rejected — public city derives from travel origin, with import-preserved city fallback when origin city is empty |
| Free-text cuisine / philosophy   | Rejected — fixed catalogs via comboboxes                                                                         |

### Chosen

Profile, travel, call, and flat Stripe columns on the cook record; cook updates and dedicated Stripe mutations; Places optional for address
suggestions and driving distance; wallet page owns one-shot return/refresh handlers only (never from layout or SSR).

## Ideas

- On public profile, show when the cook is featured on city or partner landing pages.
- Cook self-serve UI to edit `stageName` (API + public display already support it; admins can edit on user detail).

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

### Travel radius map

On **Travel settings** (`/profile/travel`), show a map centered on the travel origin with the max-distance radius drawn as a circle so cooks
can see at a glance which area their booking-request pool covers. Edit mode should update the circle live when max distance or origin
changes. Customers still only see city, never the pin or street.

## Implementation

- Analytics overview strip: `Cook.analytics` on `ProfilePage` (past month); full page in [cook-analytics.md](./cook-analytics.md)
- Schema: `Cooks` in `src/server/db/schema.ts` (`logoFileUploadId` → `FileUploads`; optional `stageName` public display name;
  `lastModifiedAt` bumped on cook-row writes; import-preserved `legacyCityName` / `legacyLatitude` / `legacyLongitude` — `legacyCityName`
  falls back for public cook city when exact origin city is empty; lat/lng stay storage-only); domain helpers `src/server/domain/cook.ts`
- Stage name: `Cook.stageName` / `PublicCook.stageName` / `AdminCook.stageName`; `CookUpdate.stageName` (null / blank clears). Public
  `PublicCook.user.display` prefers a non-empty stage name over first name.
- Additional picture (API: logo): `Cook.logo` / `PublicCook.logo` (`FileUpload`); `CookUpdate.logoFileUploadId` (null clears); public GET
  when referenced as current cook picture; UI `CookLogoEditor` on `/profile/public` (beside visibility; copy: Zusätzliches Bild / Additional
  picture) + `CookAboutBenefitsFallback` on About when unset; crop `IMAGE_CROP_ASPECT.logo` = 16/9
- Catalogs: `src/shared/cookProfile.ts` — validated in `cookUpdate`
- Display pills: `CookProfileTags` / `CookProfileTag` in `src/web/components/CookProfileTags.tsx` — shared muted chips for cuisine style +
  cooking philosophy on chef-profile read, public/hero/offer/featured surfaces (not `Badge secondary`, which is white-on-card)
- Places: `src/server/places/` — Text Search + Routes driving km for offer travel; env `GOOGLE_PLACES_API_KEY`,
  `Session.locationSuggestions`
- Booking travel: `travelDistanceKmResolve` — Routes preferred, haversine fallback; stamped on `BookingRequestCooks` at first open; customer
  edit previews per-offer delta via travel impact; origin / venue edits clear the stamp
- Commands: `cookUpdate` (queues `cook-biography-summary-generate` on biography save; does not await the LLM), `cookBiographySuggest` (gated
  by `COOK_BIOGRAPHY_AI_WRITE`), `cookBiographySummaryGenerate`, `cookBiographySuggestGenerate`, `cookStripeOnboardingStart`,
  `cookStripeStatusSync` (calls shared `cookStripeAccountStatusApply`), `cookStripeDashboardUrlCreate`, `adminCookApprovalUpdate`,
  `adminCookUpdate` (manual `biographySummary`, no auto AI), `adminCookBiographySuggest` (same toggle), `adminCookBiographySummarySuggest`
  (always available), `adminCookMealCreate`, `adminCookMenuCreate`, `userCookCreate`, `userCreate` (optional nested cook); approval email
  via `adminCookApprovalUpdateEmailSend`; Connect webhook sync via `stripeWebhookApply` → `cookStripeAccountStatusApply`
- Biography summary job: `cookBiographySummaryGenerate` handler; schedule helpers in `cookBiographySummaryGenerateSchedule` match pending
  work by payload `{ cookId }` (states `created` | `retry` | `active`); GraphQL `Cook.biographySummaryGenerating` /
  `AdminCook.biographySummaryGenerating` — see [jobs.md](../architecture/jobs.md)
- UI: `BiographySuggestionReview` for cook + admin enhance accept-into-form / discard; summary skeleton on chef-profile view/edit when
  generating
- AI kinds: `COOK_BIOGRAPHY_SUGGESTION`, `COOK_BIOGRAPHY_SUMMARY` — dedicated models `cookBiographySuggestModel` /
  `cookBiographySummaryModel` — see [ai-generations.md](../architecture/ai-generations.md)
- Wallet live details: `Cook.stripeAccountDetails` → `cookStripeAccountDetailsFindOne` → `stripe.accountRequirementsFindOne` (category
  buckets, not raw Stripe keys); `Cook.stripeWallet` → `cookStripeWalletFindOne` (gated by `COOK_WALLET_STRIPE_BALANCE`) →
  `stripe.accountBalanceFindOne` + `stripe.accountBalanceTransactionsFindMany` (EUR cents + mapped transaction kinds, not raw Stripe type
  strings)
- Chef sign-up: `/chef-sign-up` — one-shot create or upgrade form with shared travel fields
- Profile UI: chef profile view/edit, travel view/edit, public page (Preview / Manage tabs via `?tab=manage`), wallet, calls, overview
  Attention + Getting started on cook home (`profilePageCookOverview`, `ProfilePage` with upcoming-call window variables)
- Cook GraphQL: `mealsCounts` / `menusCounts` (`CookMealCriterion` / `CookMenuCriterion`);
  `callSlotBookings(criterion: CookCallSlotBookingCriterion)` for status + `startAt` window
- Admin: pending-approval queue on `/admin`; cook-profile tab (read-only + approval/visibility; edit at
  `/admin/users/<userId>/cook-profile/edit`); meals/menus create on user detail; users list unapproved filter

See [cook-shell.md](./cook-shell.md), [admin-users.md](./admin-users.md), [stripe-payment.md](../architecture/stripe-payment.md).
