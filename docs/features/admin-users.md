# Admin users

Operators inspect membership, create accounts, and drill into per-user sessions, bookings, cook inventory, and notes.

## Behavior

Admins manage accounts under `/admin/users` (overview + list + create + detail), with sidebar sub-links for list and create.

### Overview — `/admin/users`

Membership distribution (total, customer, cook, admin) and registration bar chart. Date range in URL drives zero-filled daily buckets.
Section cards link to list and create. Distribution cards deep-link into the list with `type` preselected (Total clears the filter).

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
`AdminBookingRequestListCard` grid; create in pinned footer → `/admin/booking-requests/create?userId=`), **cook-profile** (approve/revoke,
visibility, travel, biography/tags — [cook-profile.md](./cook-profile.md)), **meals** / **menus** (browse + create draft), **offers**
(cook-created offers as `AdminBookingRequestOfferCard` grid), **whatsapp** (conversations for that user), **session-events** (first-party
analytics timeline across the user’s sessions; pinned bottom pagination with `page` / `pageSize` in the URL, default 25). Lazy-loaded tab
data where noted in implementation. Tab actions use `AdminPinnedFooterLayout` so more tabs can grow footers over time.

**General** defaults to a read-only detail on a full-width two-column desktop layout: sticky identity aside (avatar, name, status, types,
registered, user id with copy) plus a fluid main column that fills the remaining width (no `max-w-*`). View mode lays contact fields in a
responsive grid (2 cols from `sm`, 3 from `xl`); email and phone offer copy plus `mailto:` / `tel:` action links when set; danger zone sits
full-width under a divider. **Edit** / **Cancel** / **Save** and a quieter **Sign in as** live in the pinned footer. **Edit** switches the
main column into a multi-column form for first/last name, email (direct, no OTP), phone, birth date, preferred communication, time zone, and
profile picture (`AdminMutation.userUpdate` / `userEmailAddressUpdate`); **Cancel** or successful **Save** returns to view. Account status
(`ACTIVE` / `BANNED` / `ANONYMIZED`) with **Ban** / **Unban** (`AdminMutation.userStatusUpdate`, `ACTIVE` ↔ `BANNED` only) stays on the
identity aside in both modes. Ban keeps sessions bound so the private profile restriction banner can appear live; open cook offers are
auto-declined; public cook listing already excludes non-`ACTIVE`. **Sign in as** rebinds the admin cookie session to that ACTIVE account
(`AdminMutation.sessionUserBind`), sets the locale cookie to that user’s `Users.locale`, and navigates to `/profile` (or `/en/profile`) in
that locale so the locale-mismatch gate does not open on the way in (exit = re-auth as admin). Danger-zone **Anonymize**
(`AdminMutation.userAnonymize`) is view-only (hidden while editing). Already-anonymized users cannot be edited, banned, or impersonated.
Same scrub as self-serve delete — see [account.md](./account.md).

**Cook profile** toggles admin approval and public visibility (both behind confirm dialogs), and patches biography, biography summary,
cuisine/philosophy catalogs, and travel fields via `AdminMutation.cookUpdate` (legal acceptance asserted on the admin, not the cook). Admin
can edit biography and summary manually. **Write with AI / Improve with AI** opens a side-by-side review; **Accept** fills the biography
field (save still required; no auto summary job). The suggest mutation is gated by `COOK_BIOGRAPHY_AI_WRITE` (admin UI stays visible when
the toggle provider is absent; server rejects when off). **Generate summary** fills the summary field via AI without persisting until Save
and is **not** feature-toggled. Unlike cook self-serve saves, admin biography saves do **not** auto-regenerate the summary.

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

- SDL: `AdminUser`, types, criterion, registrations, create, admin note update in `schema.graphqls`
- Queries: `adminUserFindMany`, `adminUserCounts`, `adminUserRegistrationsFindMany`, `adminUserFindOne`; criterion helpers
- Commands: `adminUserCreate` (transaction when membership rows); `adminUserAdminNoteUpdate`; `adminUserUpdate`;
  `adminUserEmailAddressUpdate`; `adminUserStatusUpdate`; `adminSessionUserBind`; `adminUserAnonymize`; `adminSessionTerminateMany`;
  `adminCookUpdate`; `adminCookBiographySuggest`; `adminCookBiographySummarySuggest`; `adminCookMealCreate`; `adminCookMenuCreate`
- Mapper: `toGqlAdminUser` (`profilePicture` resolved like public `User`)
- Resolvers under `Admin` / `AdminMutation`
- UI: overview with stat cards + chart; list with tabs, data table, and pinned `AdminListPaginationBar`; create form; detail with `@include`
  per tab; session-events tab uses `Admin.sessionEvents` + `Admin.sessionEventsCounts` with pinned `AdminListPaginationBar`;
  `AdminUserGeneralSection`, `AdminUserCookProfileSection`; booking-requests / offers tabs reuse `AdminBookingRequestListCard` /
  `AdminBookingRequestOfferCard` (same field selections as the booking-request list / detail offer cards)
- Routes: `users.tsx`, `users_.list.tsx`, `users_.create.tsx`, `users_.$userId.tsx`
- Nav: `adminUsers.ts`, sidebar subs — [admin-shell.md](./admin-shell.md)

GraphQL: `users(criterion)` / `userCounts(criteria)` — search, types filter, optional `status`, sort, paginate; `userRegistrations(range)`;
`user(id)`; `userCreate`, `userUpdate`, `userEmailAddressUpdate`, `userAdminNoteUpdate`, `userStatusUpdate`, `sessionUserBind`,
`userAnonymize`, `terminateSessions`, `cookUpdate`, `cookBiographySuggest`, `cookBiographySummarySuggest`, `cookMealCreate`,
`cookMenuCreate`. Type labels: admin (admins row), cook (cooks row), customer (no cook row); combinations allowed. `AdminUser.status`
exposes `UserStatus`.

Gate: [authorization-admin.md](../architecture/authorization-admin.md).

See [admin-booking-requests.md](./admin-booking-requests.md), [cook-meals.md](./cook-meals.md),
[admin-assistant-chats.md](./admin-assistant-chats.md).
