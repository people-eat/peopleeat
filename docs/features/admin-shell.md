# Admin shell

Signed-in admins get a floating-sidebar workspace for operations, legal, users, booking ops, and diagnostics under `/admin/*`.

## Behavior

Visiting `/admin/*` as an admin shows:

- **Header:** peopleeat logo linking to the public landing page.
- **Nav:** Labeled groups from `ADMIN_NAV_GROUPS` in `adminCatalog.ts` (flat links, not nested parents):
  - **Overview** (unlabeled) — home queues.
  - **Operations** — Users (list/create), Booking requests (list/create), Support, Calls.
  - **Messaging** — Offer chat review ([admin-offer-chat-review.md](./admin-offer-chat-review.md)), WhatsApp ([whatsapp.md](./whatsapp.md)),
    outbound emails, assistant chats.
  - **Commerce** — Voucher purchases, promo codes.
  - **Catalog** — Meals, menus, reviews ([cook-meals.md](./cook-meals.md), …).
  - **Content** — Websites (SEO), blog, cities, partners, occasions, Legal texts (privacy, terms, imprint).
  - **Insights** — Analytics, sessions, map.
  - **Platform** — Scheduled jobs ([admin-jobs.md](./admin-jobs.md)), logs, AI generations, feature toggles
    ([admin-feature-toggles.md](./admin-feature-toggles.md)), file store, important links. Implemented surfaces link to their feature docs
    (e.g. [admin-booking-requests.md](./admin-booking-requests.md)).
- **Footer:** Profile → `/profile`; Account → `/admin/account` (stays in admin shell).
- **Sidebar search:** sticky under the logo (outside the nav scrollport). Plain filter input narrows visible nav groups/items; it does not
  open a dropdown over the links. **⌘K / Ctrl+K** (or the shortcut chip on the filter) opens a command dialog to jump to any destination
  from `adminNavPages()`. Planned entity search still lives in [admin-global-search.md](./admin-global-search.md).
- **Main pane header:** nav trigger + breadcrumbs + accent assistant trigger (soft orange pill, one-shot border orbit on mount; closed by
  default). Compact on mobile (`h-12` / tighter content `pt`) — [theme.md](../styles/theme.md#workspace-chrome-density).
- **Main pane body:** viewport-locked inset; default scroll on content; full-bleed chat pages override so transcript scrolls inside chat
  chrome and composer stays pinned. Document scroll is off — `html` opts out of document scrollbar gutters; the inset uses one-sided
  `scrollbar-gutter-stable` ([theme.md](../styles/theme.md)). Navigating to another admin path resets the inset (and pinned-footer body) to
  the top — [theme.md — Route scroll reset](../styles/theme.md#route-scroll-reset).
- **Assistant rail:** floating right sidebar; wired chat today with admin assistant target documented in [assistants.md](./assistants.md)
  and [assistant-sidebar.md](./assistant-sidebar.md). Lazy-loaded on first open. Full-screen owner chat lives at `/admin/assistant` (+
  `$chatId`) and hides the rail while open.

Unsigned visitors redirect to sign-in with return URL. Signed-in non-admins redirect to `/profile`.

Mobile: left nav sheet closes on route change.

### Overview — `/admin`

Home aggregates urgent queues and jump-off search — detail work stays on dedicated pages.

**Action queues (today):**

- Pending cook approvals → user cook-profile tab; “View all” → filtered users list. See [cook-profile.md](./cook-profile.md).
- Booking requests blocked for admin review → request detail; “View all” → booking list.
- Due cook payouts → offer detail (payment tab).
- Open support requests → support detail. See [support-requests.md](./support-requests.md).
- Offer chats awaiting admin review → review pipeline. See [admin-offer-chat-review.md](./admin-offer-chat-review.md).

The same five queues are summarized daily at 08:00 Europe/Berlin on the Slack ops-alerts channel — see
[slack-notifications.md](./slack-notifications.md).

**Planned queue:** offers where someone tagged `@concierge` / `@juliana` in offer chat — deep-link to admin offer chat tab. Separate from
the mandatory offer-chat review pipeline. See [booking-offer-chat.md](./booking-offer-chat.md).

**Layout:** KPI strip (`AdminOverviewStatCard`) for the five queue counts — one column on narrow viewports, two from `sm`, three from `xl`,
five from `2xl` so long German labels are not mid-word broken. Cards with work waiting use a soft warning highlight and deep-link to the
filtered list where one exists (approvals, booking review, support, offer chats; due payouts stay count-only). Item lists render only for
non-zero queues (two columns from `lg`). When every queue is clear, one success `StatusAlert` replaces the empty panels. Sticky sidebar
filter + ⌘K/Ctrl+K pages dialog sit under the logo (planned expansion: entity global search). When the sidebar nav is scrolled down, a
floating scroll-to-top control appears at the top of the visible sidebar.

Stub routes show bilingual “coming soon” until shipped. Sessions, analytics, logs, scheduled jobs, AI generations, promo codes, booking
requests, assistant chats, gift cards, outbound emails (overview + list), important links, web pages SEO, and feature toggles are
implemented.

### Breadcrumbs

Page-owned crumbs via admin page chrome — no leading “Admin”. List/overview use path helper; detail pages pass entity labels. Examples
include Overview, Account, Users › List/Create/Name, Booking requests › List/Create/Occasion, Sessions › List/User, Legal ›
kind/draft/version, Promo codes, Assistant chats, etc.

### List pagination

Paginated admin lists pin controls in an `AdminPinnedFooterLayout` footer via `AdminListPaginationBar` (prev/next, “Page X of Y”, range, and
per-page size). Density follows a **container query** on the bar (`@container` / `@xl`), not the viewport, so a narrow admin inset (sidebar
open) stays condensed: the “Per page” label hides (select keeps an `aria-label`), range/page copy shortens to `from–to/total` and
`page/pageCount`, and prev/next compress to icon buttons. The body scrollport keeps a small top pad (`pt-1`) so focus rings on the first
control row are not clipped. Page and size live in the URL (`page`, `pageSize`; default size 25, omitted when default). Shared parse/skip
helpers: `adminListPaginationSearch.ts`. List routes that load from search params must declare `loaderDeps: ({ search }) => search` so page
/ filter / debounced `q` changes re-run the loader (see [api-layer.md](../architecture/api-layer.md#filter-state-in-the-url)); omitting it
leaves the URL ahead of stale loader data. Migrated: users, booking requests, calls, assistant chats, gift cards, meals, menus, promo codes,
outbound emails, WhatsApp chats, support requests, sessions, jobs (client-side over the pending snapshot), logs. Remaining admin tables
still use in-table pagination until migrated.

## Decisions

### Alternatives considered

| Option                                      | Pros                           | Cons                          |
| ------------------------------------------- | ------------------------------ | ----------------------------- |
| Per-page full-bleed + in-page breadcrumbs   | Minimal chrome                 | No persistent nav             |
| Nested “Administration” parent group        | Matches sample layouts         | Extra noise                   |
| Flat root nav, no section labels            | Productive; deep-linkable      | Hard to scan as catalog grows |
| Flat links in labeled groups (chosen)       | Scannable; still deep-linkable | Group labels need curation    |
| Leading “Admin” breadcrumb                  | Explicit label                 | Redundant with sidebar        |
| Path-only crumbs in layout                  | Zero wiring                    | Detail labels stuck generic   |
| Page-owned crumbs via chrome props (chosen) | Explicit detail labels         | Every page wraps chrome       |
| Dedicated assistant-chats page only         | Full-width chat                | Hidden unless navigated       |
| Always-on assistant rail (chosen)           | Matches profile; on every page | Narrower chat column          |

### Chosen

Floating sidebar + nested assistant pane in admin layout. Each page wraps content in path or explicit breadcrumb chrome. Flat nav items
grouped under bilingual `SidebarGroupLabel`s (`ADMIN_NAV_GROUPS`); legal, users, sessions, logs, booking requests, etc. remain sub-routes.
Stub catalog shared until real pages land.

## Ideas

- Concierge-tagged offer chats on overview action queue (see [booking-offer-chat.md](./booking-offer-chat.md)).
- Weekly Slack platform brief sharing snapshot helpers with the daily admin action-item report.
- Admin global search extending the ⌘K pages dialog with entity hits.

## Implementation

- Gate: `/admin` loader — unsigned → sign-in; non-admin → `/profile`.
- `SidebarInset` as `<div>`; viewport-locked; chat pages pass overflow-hidden content class.
- Assistant: nested provider; `useAdminNavSidebar()` for left nav toggle; chat persists across admin route changes —
  [chat.md](../architecture/chat.md).
- Legal, users, sessions, logs, AI generations, booking requests, assistant chats, outbound emails: overview + list (+ create where
  applicable) + detail routes; sidebar sub-links from catalog helpers.
- Sidebar order/groups: `ADMIN_NAV_GROUPS` (+ `ADMIN_STUB_ROUTES` in matching sequence) in `adminCatalog.ts`; `AdminSidebar` maps groups to
  `SidebarGroup` / `SidebarGroupLabel`.
- Overview: KPI strip + conditional queue lists (pending cooks, blocked publications, due payouts, open support, offer-chat reviews; each
  list capped at 5); `AdminOverviewStatCard` attention tone when count > 0. `AdminSidebarNavFilter` is sticky in `SidebarHeader`;
  `AdminPagesCommandDialog` handles ⌘K/Ctrl+K. A floating scroll-to-top control appears when the nav scrollport is scrolled down.
- Header assistant control: `AssistantTriggerButton` (accent pill + mount orbit) from `AdminPageChrome`.
- Key files: `AdminLayout.tsx`, `AdminSidebar.tsx`, `AdminSidebarNavFilter.tsx`, `AdminPagesCommandDialog.tsx`, `AdminPageChrome.tsx`,
  `AdminPinnedFooterLayout.tsx`, `AdminListPaginationBar.tsx`, `adminListPaginationSearch.ts`, `AssistantTriggerButton.tsx`,
  `AdminAssistantSidebar.tsx`, `adminCatalog.ts`, `adminNavPages.ts`, `AdminOverviewPage.tsx`.

Gate design: [authorization-admin.md](../architecture/authorization-admin.md). Legal: [admin-legal.md](./admin-legal.md).
