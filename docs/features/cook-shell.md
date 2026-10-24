# Cook shell

Signed-in cooks get a persistent floating-sidebar workspace for every tool under `/profile/*`.

## Behavior

Visiting `/profile/*` as a cook shows:

- **Header:** peopleeat logo linking to the public landing page.
- **Nav:** Overview at `/profile`, then Booking request pool with a `NotificationBadge` for open requests to review, Sent offers with a
  `NotificationBadge` for unread notifications across offers, Analytics (when `COOK_ANALYTICS` is on — see
  [cook-analytics.md](./cook-analytics.md)), Chef profile, Public profile, Travel settings, Meals, Menus, Wallet, Gesprächstermine (call
  appointments). Wallet shows a warning `StatusBadge` when the cook is approved and payout setup is incomplete — see
  [status-messaging.md](../styles/status-messaging.md). Pool, offer counts, and wallet attention seed from the profile loader and stay live
  via real-time user updates.
- **Footer:** Account at `/profile/account`. When the cook is also an admin, an Admin link appears above Account (same escape-hatch pattern
  as Admin → Profile).
- **Main pane header:** sidebar trigger + path breadcrumbs (no leading “Profile”) + accent assistant trigger on the right (soft orange pill,
  one-shot border orbit on mount; closed by default). Compact on mobile (`h-12` / tighter content `pt`) so the trail sits close to the body
  — see [theme.md](../styles/theme.md#workspace-chrome-density). Hidden when `ASSISTANT_COOK` is off — see
  [admin-feature-toggles.md](./admin-feature-toggles.md).
- **Assistant rail:** floating right sidebar matching the left nav’s design and open/close animation. Same toggle gate as the trigger;
  full-screen `/profile/assistant` redirects to `/profile` when off. See [assistant-sidebar.md](./assistant-sidebar.md) and
  [assistants.md](./assistants.md). On mobile the assistant sheet is full-screen.
- Customers still see the [customer shell](./customer-shell.md) on `/profile` and `/profile/account`. Cook-only sub-routes show access
  denied for non-cooks. Cook vs customer shells load as separate chunks so each role only downloads its own nav graph.

Mobile: the left nav sheet closes when the route changes after a nav selection.

Stub routes show a bilingual “coming soon” placeholder until their features land. **Meals**, **Menus**, **Chef profile**, **Public profile**
(Preview / Manage tabs: listing-card + detail WYSIWYG + share on Preview; visibility + additional picture on Manage), **Travel settings**,
**Wallet**, **Gesprächstermine**, **Analytics** (toggle-gated), the **booking request pool**, and the **sent offers** inbox are implemented
— see [cook-meals.md](./cook-meals.md), [cook-menus.md](./cook-menus.md), [cook-profile.md](./cook-profile.md),
[cook-analytics.md](./cook-analytics.md), [cook-call-availability.md](./cook-call-availability.md), [booking.md](./booking.md), and
[booking-offers.md](./booking-offers.md).

### Breadcrumbs

Breadcrumbs answer “where within the cook profile?”, not “are you in profile?”. Examples:

- `/profile` → Overview
- `/profile/chef-profile` → Chef profile
- `/profile/chef-profile/edit` → Chef profile › Edit
- `/profile/public` → Public profile
- `/profile/travel` → Travel settings
- `/profile/travel/edit` → Travel settings › Edit
- `/profile/meals` → Meals
- `/profile/meals/<mealId>` → Meals › Meal
- `/profile/meals/<mealId>/edit` → Meals › Meal › Edit
- `/profile/menus` → Menus
- `/profile/menus/<menuId>` → Menus › Menu
- `/profile/menus/<menuId>/edit` → Menus › Menu › Edit
- `/profile/wallet` → Wallet
- `/profile/analytics` → Analytics
- `/profile/booking-request-pool` → Booking request pool
- `/profile/booking-request-pool/<bookingRequestId>` → Booking request pool › Request
- `/profile/booking-request-offers` → Sent offers
- `/profile/booking-request-offers/<offerId>` → Sent offers › {customer display name}
- `/profile/booking-request-offers/<offerId>/edit-price` → Sent offers › {customer} › Edit price
- `/profile/booking-request-offers/<offerId>/edit-menus` → Sent offers › {customer} › Edit menus
- `/profile/calls` → Gesprächstermine / Call appointments
- `/profile/account` → Account

## Decisions

### Alternatives considered

| Option                                       | Pros                                     | Cons                                         |
| -------------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| Keep per-page full-bleed cook pages          | Minimal shared chrome                    | No persistent cook nav                       |
| Separate `/cook/*` tree                      | Clear role URL                           | Conflicts with single `/profile` + cook role |
| Floating sidebar under `/profile/*` (chosen) | Matches admin shell; deep-linkable tools | Customers share the parent path              |

### Chosen

Floating sidebar + nested assistant pane in profile layout when the account has cook membership. Child pages own only main content. Stub
destinations share a catalog until real pages replace them. `/profile/account` is a normal child route. Customers use the
[customer shell](./customer-shell.md); cook-only paths gate with access denied.

## Implementation

- Gate unchanged for unsigned sessions (redirect to sign-in). Cook vs customer still keyed off nullable cook membership.
- `SidebarInset` is a `<div>` so pages do not nest `<main>` landmarks ([conventions](../conventions.md)).
- Cook inset is viewport-locked with a scrollable content pane under the chrome header. That pane owns default page scroll; its padding is
  paint room for outset focus rings / card shadows. Document scroll is off — `html` opts out of document scrollbar gutters; the inset uses
  one-sided `scrollbar-gutter-stable` ([theme.md](../styles/theme.md)). Path changes reset that pane (and pinned-footer bodies) to the top —
  [theme.md — Route scroll reset](../styles/theme.md#route-scroll-reset). Pages must not put overflow scroll on `<main>` unless they
  introduce a nested scrollport.
- **Pinned action footers:** meal/menu view+edit, booking-request pool detail, offer create, and offer price/menus edit pages use
  `ProfilePinnedFooterLayout` (grid body scroll + bottom action row). Cook offer detail keeps the layout for tab scrollports; the footer
  appears for pre-accept **Confirm changes** (`COOK_NEEDS_TO_ACCEPT`) and post-accept **Accept change** / **Decline** (participant
  amendment). Edit-menus / edit-price CTAs sit end-aligned under the Offer-tab sections. Do not use CSS sticky for shell action bars. Cook
  edit footers gate Save on dirty state (clean → single back/view CTA) — see
  [conventions.md](../conventions.md#profile-pinned-action-footers). Offer chat keeps its own composer grid ([chat.md](../styles/chat.md)).
  Detail views are view-first; see [conventions.md](../conventions.md#view-first-entity-details).
- Stub catalog: `src/web/pages/profile/cookCatalog.ts`; thin pages under `src/web/pages/profile/Profile*Page.tsx`; thin routes under
  `src/routes/{-$locale}/profile/`.
- Breadcrumbs: `CookBreadcrumbs` (path + stub titles + account).
- Mobile close: `CookSidebar` closes the mobile sheet when `pathname` changes.
- Assistant: nested provider in `ProfileAssistantPane`; header nav trigger still toggles `CookSidebar`; header AI entry is
  `AssistantTriggerButton` (accent pill + mount orbit). Assistant provider disables Ctrl/Cmd+B and skips cookie persistence.
  `ProfileAssistantSidebar` ships a close control (required on mobile full-screen) and a pinned composer (local draft only until chat is
  wired). See [assistants.md](./assistants.md).
- Admin footer link: `isAdmin` from profile / account loaders.
- Key files: `src/web/pages/profile/ProfileLayout.tsx` (`CookShell`, `ProfileAssistantPane`), `src/web/components/CookSidebar.tsx`,
  `CookBreadcrumbs.tsx`, `CookAccessDenied.tsx`, `AssistantTriggerButton.tsx`, `ProfileAssistantSidebar.tsx`,
  `ProfilePinnedFooterLayout.tsx`.
- Loader fields: `CookSidebar.graphql` — `isApprovedByAdmin` / stripe status plus pool/offer counts.

See also [profile.md](./profile.md), [customer-shell.md](./customer-shell.md), and [admin-shell.md](./admin-shell.md).
