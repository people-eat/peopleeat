# Admin users

Operators inspect membership, create accounts, and drill into per-user sessions, bookings, cook inventory, and notes.

## Behavior

Admins manage accounts under `/admin/users` (overview + list + create + detail), with sidebar sub-links for list and create.

### Overview — `/admin/users`

Section order matches other admin overviews: section cards, membership distribution, registration bar chart, then demographic insights and
upcoming birthdays. Date range in URL drives zero-filled daily buckets for registrations only. Distribution cards deep-link into the list
with `type` preselected (Total clears the filter).

**Insights** (all non-anonymized accounts, independent of the chart range): ranked breakdowns for preferred communication, locale, and top
time zones (count + share of non-anonymized accounts). **Age and birthdays** follows with median + average age and birth-date sample size,
then upcoming birthdays (name links to the user detail; shows next date and age they turn). Median is the primary age signal; average stays
for comparison when the distribution is skewed.

### List — `/admin/users/list`

Search by name or email. Tabs filter membership type (customer / cook / admin) and account status (`ACTIVE` / `BANNED` / `ANONYMIZED`).
Sortable table (includes status column), pinned bottom pagination bar with per-page size (`page` / `pageSize` in the URL; default 25), row
or chevron → detail. When `type=cook`, optional `unapproved=1` shows cooks awaiting approval.

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
switches into a form for first/last name, email (direct, no OTP), phone, birth date, preferred communication, time zone, and profile picture
(`AdminMutation.userUpdate` / `userEmailAddressUpdate`); **Cancel** or successful **Save** returns to view. Ban keeps sessions bound so the
private profile restriction banner can appear live; open cook offers are auto-declined; public cook listing already excludes non-`ACTIVE`.
**Sign in as** rebinds the admin cookie session to that ACTIVE account (`AdminMutation.sessionUserBind`), sets the locale cookie to that
user’s `Users.locale`, and navigates to `/profile` (or `/en/profile`) in that locale so the locale-mismatch gate does not open on the way in
(exit = re-auth as admin). Already-anonymized users cannot be edited, banned, or impersonated. Same scrub as self-serve delete — see
[account.md](./account.md).

**Cook profile** defaults to a read-only detail: approval/visibility/Stripe-active badges, optional rating summary, stage name, travel,
Stripe account + Dashboard link, call scheduling + weekly windows, About logo, tags, biography/summary (with generating hint), public chef
link when approved + visible, featured city/partner/occasion landings, and created/last-modified timestamps; confirm-gated approve/revoke
and public-visibility actions sit at the bottom. Legacy price/participant columns stay on `AdminCook` / `CookUpdate` but are not shown here
(unused in product matching). Live Stripe wallet/requirements are not fetched on this page. **Edit** in the pinned footer opens
`/admin/users/<userId>/cook-profile/edit`, where admins patch stage name, biography, biography summary, cuisine/philosophy catalogs, and
travel fields via `AdminMutation.cookUpdate` (legal acceptance asserted on the admin, not the cook). The About logo uses `CookLogoEditor`
and saves immediately via `logoFileUploadId`. Admin can edit biography and summary manually. **Write with AI / Improve with AI** opens a
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

- SDL: `AdminUser`, types, criterion, registrations, `AdminUserInsights` / upcoming birthday types, create, admin note update in
  `schema.graphqls`
- Queries: `adminUserFindMany`, `adminUserCounts`, `adminUserRegistrationsFindMany`, `adminUserInsightsFindOne`,
  `adminUserUpcomingBirthdaysFindMany`, `adminUserFindOne`; criterion helpers
- Commands: `adminUserCreate` (transaction when membership rows); `adminUserAdminNoteUpdate`; `adminUserUpdate`;
  `adminUserEmailAddressUpdate`; `adminUserStatusUpdate`; `adminSessionUserBind`; `adminUserAnonymize`; `adminSessionTerminateMany`;
  `adminCookUpdate`; `adminCookBiographySuggest`; `adminCookBiographySummarySuggest`; `adminCookMealCreate`; `adminCookMenuCreate`
- Mapper: `toGqlAdminUser` (`profilePicture` resolved like public `User`)
- Resolvers under `Admin` / `AdminMutation`
- UI: overview with stat cards, insights breakdowns, upcoming birthdays, + chart; list with tabs, data table, and pinned
  `AdminListPaginationBar`; create form; detail with `@include` per tab; session-events tab uses `Admin.sessionEvents` +
  `Admin.sessionEventsCounts` with pinned `AdminListPaginationBar`; `AdminUserGeneralSection`, `AdminUserCookProfileSection`,
  `AdminUserCookProfileEditPage`; booking-requests / pool / offers tabs reuse `AdminBookingRequestListCard` /
  `AdminBookingRequestOfferCard`; testimonials tab reuses `AdminTestimonialListCard`; calls tab uses a compact `callTraffic` list
- `AdminCook` field resolvers: `logo`, `rating`, `callAvailabilityRules`, `featuredOn` (city/partner/occasion reverse index)
- `Admin.customerTestimonials` / `cookTestimonials` accept optional criterion (`cookIds`, skip/take); omit criterion = full catalog
- `AdminBookingRequestCriterion.cookIds` + `notifiedOnly` filter via `BookingRequestCooks`
- Routes: `users.tsx`, `users_.list.tsx`, `users_.create.tsx`, `users_.$userId.tsx`, `users_.$userId_.cook-profile_.edit.tsx`
- Nav: `adminUsers.ts`, sidebar subs — [admin-shell.md](./admin-shell.md)

GraphQL: `users(criterion)` / `userCounts(criteria)` — search, types filter, optional `status`, optional `userIds` (`IN`; omit or empty = no
id filter — admin assistant drill-in), sort, paginate; `userRegistrations(range)`; `userInsights`; `upcomingBirthdays(take)`; `user(id)`;
`userCreate`, `userUpdate`, `userEmailAddressUpdate`, `userAdminNoteUpdate`, `userStatusUpdate`, `sessionUserBind`, `userAnonymize`,
`terminateSessions`, `cookUpdate`, `cookBiographySuggest`, `cookBiographySummarySuggest`, `cookMealCreate`, `cookMenuCreate`. Type labels:
admin (admins row), cook (cooks row), customer (no cook row); combinations allowed. `AdminUser.status` exposes `UserStatus`.

Gate: [authorization-admin.md](../architecture/authorization-admin.md).

See [admin-booking-requests.md](./admin-booking-requests.md), [cook-meals.md](./cook-meals.md),
[admin-assistant-chats.md](./admin-assistant-chats.md).
