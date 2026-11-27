# Admin users

Operators inspect membership, create accounts, and drill into per-user sessions, bookings, cook inventory, and notes.

## Behavior

Admins manage accounts under `/admin/users` (overview + list + create + detail), with sidebar sub-links for list and create.

### Overview — `/admin/users`

Section order matches other admin overviews: section cards, membership distribution, registration bar chart, then demographic insights and
upcoming birthdays. Date range in URL drives zero-filled daily buckets for registrations only. Distribution cards deep-link into the list
with `type` preselected (Total clears the filter). Membership distribution has an **Analytics** button to `/admin/analytics?tab=cooks`; the
registrations heading has an **Analytics** button to `/admin/analytics?tab=sign-in` with the same `from` / `to`.

**Insights** (all non-anonymized accounts, independent of the chart range): ranked breakdowns for preferred communication, locale, and top
time zones (count + share of non-anonymized accounts), plus overlapping linked-method counts (Google linked, Facebook linked, passkey
present, authenticator app enrolled). Copy must not imply a partition: one account can have Google, Facebook, and a passkey. **Age and
birthdays** follows with median + average age and birth-date sample size **split by segment** (cooks, potential customers, actual
customers), then upcoming birthdays (name links to the user detail; type badges for cook / customer / admin; shows next date and age they
turn). Segments are mutually exclusive among non-anonymized accounts with a birth date: **cooks** (cook row), **actual customers** (no cook
row + ≥1 dual-accepted offer on a booking request they own), **potential customers** (no cook row + no dual-accepted offer). Median is the
primary age signal per segment; average stays for comparison when the distribution is skewed.

### List — `/admin/users/list`

Search by name or email. Tabs filter membership type (customer / cook / admin); a status select filters account status (`ACTIVE` / `BANNED`
/ `ANONYMIZED`). Sortable table (includes status column), pinned bottom pagination bar with per-page size (`page` / `pageSize` in the URL;
default 25), row or chevron → detail. When `type=cook`, optional `unapproved=1` shows cooks awaiting approval.

### Create — `/admin/users/create`

First name, last name, email, optional Admin and Cook checkboxes. Cook reveals required travel fields (origin, expenses, max distance).
Pinned footer (`AdminPinnedFooterLayout`) holds Cancel and Create. Success → new user detail. Legal acceptance left null so first sign-in
shows the legal gate — [admin-legal.md](./admin-legal.md).

### Detail — `/admin/users/<userId>`

Tabs via URL: **general**, **notes** (full-width editable operator note; **Save** in pinned footer), **sessions** (list with Details +
revoke; terminate-all in pinned footer), **emails**, **assistant-chats**, **booking-requests** (customer-sent requests as
`AdminBookingRequestListCard` grid; create in pinned footer → `/admin/booking-requests/create?userId=`), **cook-profile** (read-only detail
with approve/revoke and visibility actions; **Edit** in pinned footer → `/admin/users/<userId>/cook-profile/edit` —
[cook-profile.md](./cook-profile.md)), **meals** / **menus** (browse + create draft), **offers** (cook-created offers as
`AdminBookingRequestOfferCard` grid), **pool** (cook-only: booking requests where this cook was notified via `BookingRequestCooks`, not
customer-sent), **calls** (cook-only: compact `Admin.callTraffic` for that cook; footer deep-links `/admin/calls/list?cookId=`),
**testimonials** (cook-only: customer reviews on this cook’s offers + cook testimonials, via cook-scoped criterion), **whatsapp**
(conversations for that user), **session-events** (first-party analytics timeline across the user’s sessions; pinned bottom pagination with
`page` / `pageSize` in the URL, default 25). Tab order: customers get **general**, then **booking-requests**, then shared ops tabs; cooks
get **general**, **cook-profile**, **offers**, **meals**, **menus**, **pool**, **calls**, **testimonials**, then shared ops tabs, with
**booking-requests** last. Lazy-loaded tab data where noted in implementation. Tab actions use `AdminPinnedFooterLayout` so more tabs can
grow footers over time.

**General** uses the same single-column flow as cook-profile (container queries for sidebar width): status/type badges, avatar + name, then
a detail-field grid (2 cols from `@2xl`, 3 from `@6xl`). Email and phone offer copy plus `mailto:` / `tel:` when set; user id has copy. At
the bottom (view-only; hidden while editing): **Ban** / **Unban** (`AdminMutation.userStatusUpdate`, `ACTIVE` ↔ `BANNED` only) and
**Anonymize** side by side from `@2xl`. **Edit** / **Cancel** / **Save** and a quieter **Sign in as** live in the pinned footer. **Edit**
switches into a form for first/last name, email (direct, no OTP), phone, birth date, language, preferred communication, time zone, and
profile picture (`AdminMutation.userUpdate` / `userEmailAddressUpdate`). The form stays in a readable column (`max-w-3xl`): short fields sit
in two columns from `@2xl`, and preferred communication is its own row so the four choices are not squeezed beside the birth date. Language
is `Users.locale` (Deutsch / English) and applies to that account’s interface, emails, and WhatsApp. Saving it does not change the admin’s
locale cookie. **Cancel** or successful **Save** returns to view.

**Notifications** sit under the profile fields in both view and edit. Same topics as the account page (email and WhatsApp per topic; cook
topics only when the account has a cook profile). Switches save immediately via `AdminMutation.userUpdate` and do not wait for profile
**Save**. With no phone number, WhatsApp stays off and the hint opens the phone field. Anonymized accounts show that no messages are sent.
See [notification-settings.md](./notification-settings.md).

**Sign-in** lists linked Google and Facebook (read-only `createdAt`, no unlink in v1), passkeys, and authenticator-app two-factor (pending
enrollment or confirmed, plus recovery codes left). **Remove** confirms, then `AdminMutation.userPasskeyDelete` or `userTotpDelete`.
Removing two-factor does not ask for the user’s code, and it clears an in-progress second-factor sign-in. Email sign-in stays. Admins cannot
add a passkey, enroll an authenticator, or unlink Google / Facebook for someone else.

Ban keeps sessions bound so the private profile restriction banner can appear live; ban is blocked while a dual-accepted event is upcoming
or within 7 days after the last one; on ban, cancelable booking requests owned by the user are canceled and open non dual-accepted cook
offers are declined. Public cook listing already excludes non-`ACTIVE`. **Anonymize** offers Immediate (same cool-off gate, then scrub) or
Schedule (same waiting-period formula as self-serve account delete). Pending schedules show on the general tab with cancel. **Sign in as**
mints a **new** cookie session bound to that ACTIVE account (`AdminMutation.sessionUserBind`), leaving the admin session intact. The new
session stores `Sessions.impersonationReturnSessionId` pointing at the admin session. The client then hits
`GET /api/session/switch?toSessionId=…&redirect=…` so **Set-Cookie and the redirect are the same response** (mutation `Set-Cookie` then
`location.assign` can race and leave the admin cookie in place). Redirect lands on `/profile` (or `/en/profile`) after setting the locale
cookie to that user’s `Users.locale` so the locale-mismatch gate does not open on the way in. The legal-acceptance and locale-mismatch gates
are also skipped for the impersonation session, so the operator is not asked to accept privacy/terms or change that user’s language — see
[admin-legal.md](./admin-legal.md). **Return to administration** lives in the header session nav (and profile sidebar footer) in place of
the normal Administration entry (`Session.impersonation` + `sessionImpersonationEnd` + the same switch URL); it restores the admin cookie
(or mints a fresh admin session if the return session was terminated). Impersonation sessions are excluded from product funnels and badged
on admin timelines / session lists. Already-anonymized users cannot be edited, banned, or impersonated. Same scrub as self-serve delete —
see [account.md](./account.md).

**Cook profile** defaults to a read-only detail: approval/visibility/Stripe-active badges, optional rating summary, stage name, travel,
Stripe account + Dashboard link, call scheduling + weekly windows, About logo, tags, biography/summary (with generating hint), default offer
note (`null` / empty / custom text), other public profiles for review (website, Instagram, Google, Take a Chef, and named platforms; always
visible to admins, not gated by `COOK_PRESENCE_LINKS`), public URL (`/chefs/<pathName>` with copy and previous slugs), public chef link when
approved + visible, featured city/venue/occasion landings, and created/last-modified timestamps; then a **Finances** block with live Stripe
requirements checklist + Connect available/pending balance and recent balance transactions (same data as the cook finances page when
`COOK_WALLET_STRIPE_BALANCE` is on — admin always loads it, not gated by that toggle; fetched only on this tab). Confirm-gated
approve/revoke and public-visibility actions sit at the bottom. Legacy price/participant columns stay on `AdminCook` / `CookUpdate` but are
not shown here (unused in product matching). **Edit** in the pinned footer opens `/admin/users/<userId>/cook-profile/edit`, where admins
patch stage name, public URL slug (live availability, always on, not gated by `COOK_PUBLIC_PROFILE_PATH_NAME`), biography, biography
summary, cuisine/philosophy catalogs, default offer note, and travel fields via `AdminMutation.cookUpdate`, and other public profiles via
`AdminMutation.cookPresenceLinksReplace` (legal acceptance asserted on the admin, not the cook). The About logo uses `CookLogoEditor` and
saves immediately via `logoFileUploadId`. Admin can edit biography and summary manually. **Write with AI / Improve with AI** opens a
side-by-side review; **Accept** fills the biography field (save still required; no auto summary job). The suggest mutation is gated by
`COOK_BIOGRAPHY_AI_WRITE` (admin UI stays visible for ops; server rejects when off). **Generate summary** fills the summary field via AI
without persisting until Save and is **not** feature-toggled. Unlike cook self-serve saves, admin biography saves do **not** auto-regenerate
the summary. **Cancel** / successful **Save** return to the cook-profile tab.

Non-admins never reach admin routes; the layout gates on admin membership.

## Decisions

### Alternatives considered

| Option                              | Pros                          | Cons                           |
| ----------------------------------- | ----------------------------- | ------------------------------ |
| Reuse public user type in admin API | Fewer types                   | Mixed surfaces; hard to extend |
| Dedicated admin user type (chosen)  | Clear privilege boundary      | Parallel type                  |
| Side sheet on list with query param | Stay on list                  | Weak deep links                |
| Dedicated detail URL (chosen)       | Shareable                     | Extra route                    |
| List-only at `/admin/users`         | Fewer hops                    | No stats hub                   |
| Hub + list + create (chosen)        | Matches legal/booking pattern | Extra route                    |

### Chosen

Dedicated admin user under the admin GraphQL namespace; criterion bag for list/counts like logs and sessions; overview + list + create +
detail with URL tabs; manual create with optional admin and cook payloads.

## Implementation

- SDL: `AdminUser`, types, criterion, registrations, `AdminUserInsights` / `AdminUserAgeBySegment` / `AdminUserAgeStat` / upcoming birthday
  types, create, admin note update in `schema.graphqls`
- Queries: `adminUserFindMany`, `adminUserCounts`, `adminUserRegistrationsFindMany`, `adminUserInsightsFindOne`,
  `adminUserUpcomingBirthdaysFindMany`, `adminUserFindOne`; `adminUserPasskeysFindMany`, `adminUserTimeBasedOneTimePasswordFindOne`, and
  `adminUserOauthIdentitiesFindMany` on `AdminUser` (skipped unless the selection asks for them); criterion helpers
- Commands: `adminUserCreate` (transaction when membership rows); `adminUserAdminNoteUpdate`; `adminUserUpdate` (includes locale and
  notification settings); `adminUserEmailAddressUpdate`; `adminUserPasskeyDelete`; `adminUserTotpDelete`; `adminUserStatusUpdate`;
  `adminSessionUserBind`; `sessionImpersonationEnd`; `adminUserAnonymize`; `adminSessionTerminateMany`; `adminCookUpdate`;
  `adminCookBiographySuggest`; `adminCookBiographySummarySuggest`; `adminCookMealUpsert`; `adminCookMenuUpsert`
- Mapper: `toGqlAdminUser` (`profilePicture` resolved like public `User`)
- Resolvers under `Admin` / `AdminMutation`
- UI: overview with stat cards, insights breakdowns, upcoming birthdays, + chart; range-preserving links to Analytics (`tab=cooks` /
  `tab=sign-in`); list with type tabs, status select, data table, and pinned `AdminListPaginationBar`; create form; detail with `@include`
  per tab; session-events tab uses `Admin.sessionEvents` + `Admin.sessionEventsCounts` with pinned `AdminListPaginationBar`;
  `AdminUserGeneralSection`, `AdminUserSignInSection`, `AdminUserCookProfileSection`, `AdminUserCookProfileEditPage`; booking-requests /
  pool / offers tabs reuse `AdminBookingRequestListCard` / `AdminBookingRequestOfferCard`; testimonials tab reuses
  `AdminTestimonialListCard`; calls tab uses a compact `callTraffic` list. Account status / type badges: `adminUserStatusBadgeClassName`
  (status tones) and `adminUserTypeBadgeClassName` (`outline` + `bg-muted`) in `adminUsersColumns.tsx` — never `Badge variant="secondary"`
  on the white table / cards. Type pills stay on one row (`flex w-max`).
- `AdminCook` field resolvers: `logo`, `rating`, `callAvailabilityRules`, `featuredOn` (city/venue/occasion reverse index),
  `stripeAccountDetails` / `stripeWallet` (live Stripe; admin loaders, not cook ownership / balance toggle)
- `Admin.customerTestimonials` / `cookTestimonials` accept optional criterion (`cookIds`, skip/take); omit criterion = full catalog
- `AdminBookingRequestCriterion.cookIds` + `notifiedOnly` filter via `BookingRequestCooks`
- Routes: `users.tsx`, `users_.list.tsx`, `users_.create.tsx`, `users_.$userId.tsx`, `users_.$userId_.cook-profile_.edit.tsx`
- Nav: `adminUsers.ts`, sidebar subs — [admin-shell.md](./admin-shell.md)

GraphQL: `users(criterion)` / `userCounts(criteria)` — search (email / first / last / full name either order), types filter, optional
`status`, optional `userIds` (`IN`; omit or empty = no id filter — admin assistant drill-in), sort, paginate; `userRegistrations(range)`;
`userInsights`; `upcomingBirthdays(take)`; `user(id)`; `userCreate`, `userUpdate`, `userEmailAddressUpdate`, `userAdminNoteUpdate`,
`userStatusUpdate`, `userPasskeyDelete`, `userTotpDelete`, `sessionUserBind`, `userAnonymize`, `terminateSessions`, `cookUpdate`,
`cookBiographySuggest`, `cookBiographySummarySuggest`, `cookMealUpsert`, `cookMenuUpsert`. Type labels: admin (admins row), cook (cooks
row), customer (no cook row); combinations allowed. `AdminUser.status` exposes `UserStatus`.

Gate: [authorization-admin.md](../architecture/authorization-admin.md).

See [admin-booking-requests.md](./admin-booking-requests.md), [cook-meals.md](./cook-meals.md),
[admin-assistant-chats.md](./admin-assistant-chats.md).
