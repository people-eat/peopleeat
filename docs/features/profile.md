# Profile

Signed-in users land on `/profile`, which routes customers and cooks into the right sidebar shell and tools.

## Behavior

1. Open `/profile` (or `/en/profile`). Unsigned sessions redirect to sign-in.
2. **Customers** (no cook membership) see the customer shell: overview, booking requests, gift cards, account —
   [customer-shell.md](./customer-shell.md).
3. **Cooks** see the cook shell: overview, meals, menus, chef profile, wallet, call scheduling, account — [cook-shell.md](./cook-shell.md),
   [cook-meals.md](./cook-meals.md), [cook-menus.md](./cook-menus.md), [cook-profile.md](./cook-profile.md),
   [cook-call-availability.md](./cook-call-availability.md).
4. Already signed-in visits to sign-in redirect to profile; successful log-on navigates to profile.
5. Account settings live at `/profile/account` (admins use `/admin/account`) — [account.md](./account.md).
6. Users who are also admins get an Admin link in the profile sidebar footer and an Administration control on public headers.
7. Public headers show a profile icon when signed in, sign-in when anonymous, and a primary **Send request** action to the booking form for
   guests and customers (hidden for cooks).
8. Profile pictures change on the account page or chef profile edit — [profile-pictures.md](./profile-pictures.md). **Cook** overview
   surfaces Attention items and a Getting started checklist (not a permanent “approved” banner) — [cook-profile.md](./cook-profile.md).
   **Customer** overview mirrors that job: Attention (offers to review, payment due, unread chat with `?tab=chat`, upcoming call, missing
   review), a create-request CTA that is primary when empty / secondary when calm / hidden when Attention wins, a single Next dinner
   snapshot with light status counts, and Getting started only for the first request (UI uses the primary empty-state alert instead of
   duplicating the checklist). Full request grids stay on `/profile/booking-requests`.

## Decisions

### Alternatives considered

| Option                                       | Notes                                        |
| -------------------------------------------- | -------------------------------------------- |
| Separate cook and customer profile URLs      | Extra routes; membership already on the user |
| Boolean is-cook flag on user                 | Replaced by dedicated cook membership        |
| Single `/profile` with nullable cook on user | One route; UI switches on membership probes  |

### Chosen

One profile route; shell and navigation depend on cook and admin membership on the signed-in user.

## Implementation

- GraphQL: `ProfilePage($upcomingCallsFrom, $upcomingCallsTo)` loads `currentSession.user` (`ProfilePageUser` — name, cook, admin, sidebar
  badges, cook overview counts/bio/upcoming calls, customer `bookingRequests` for overview Attention / Next dinner). Overview via
  `useUserUpdatesSeed` + `ProfilePageUpdates` with the same variables.
- UI: `ProfilePage` chooses cook vs customer child (`profilePageCookOverview` / `profilePageCustomerOverview`). Both use `ProfileLayout`
  (sidebar, breadcrumbs, assistant rail, outlet). Cook-only routes show access denied for non-cooks.
- Route: `src/routes/{-$locale}/profile.tsx` — loader redirects when user null; child routes under `profile/`; noindex, not in sitemap.
- Public entry: `Header` + `PublicSessionNav` (`PublicHeaderUser` fragment) on marketing pages.

Key files: `ProfilePage*.tsx`, `ProfileLayout.tsx`, `CookSidebar.tsx`, `CustomerSidebar.tsx`, `src/routes/{-$locale}/profile/*`.

See also [cook-shell.md](./cook-shell.md), [customer-shell.md](./customer-shell.md),
[authorization-admin.md](../architecture/authorization-admin.md), [account.md](./account.md), [profile-pictures.md](./profile-pictures.md),
[sign-in.md](./sign-in.md).
