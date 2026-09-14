# Admin global search

Planned admin-wide command palette to jump to any destination or entity from any admin screen without hunting the sidebar or list filters.

## Behavior

**Not implemented yet** — target product behavior:

1. **Trigger** — Search icon in the admin page chrome header (between breadcrumbs and the assistant toggle). Optional **⌘K / Ctrl+K** opens
   the same dialog anywhere in the shell.
2. **Dialog** — Command-style overlay: search input focused on open, grouped results, Esc or backdrop closes.
3. **Query** — Typing filters:
   - **Pages / destinations** — same catalog as today’s overview destination combobox (users, booking requests, cities, websites, legal,
     stubs, …).
   - **Entities** — at minimum users, booking requests, cities, and web pages; grow with each admin detail route as surfaces ship.
4. **Select** — Row navigates to the matching admin URL and closes the dialog.
5. **Empty / loading** — Bilingual empty copy when nothing matches; brief loading while server results resolve. Never show raw API errors in
   the dialog.

### Result groups (v1)

| Group            | Match on (examples)                                 | Navigate to            |
| ---------------- | --------------------------------------------------- | ---------------------- |
| Pages            | Title, keywords, description from admin nav catalog | Catalog path           |
| Users            | First name, last name, email                        | User detail            |
| Booking requests | Occasion, customer name/email, request id           | Booking request detail |
| Cities           | German/English name, path slug                      | City detail            |
| Web pages        | Key label, titles                                   | Web page detail        |

### Later groups

Partners, occasions, blog posts, gift cards, promo codes, sessions, logs, outbound emails, meals, menus — each as its own group when list
search criteria and deep links exist. Prefer reusing existing list `searchText` patterns rather than parallel queries.

### Relationship to sidebar destination search

Shipped today: sticky sidebar **filter** (narrows nav links) + **⌘K / Ctrl+K** `AdminPagesCommandDialog` for destination jumps from
`adminNavPages()`. Global search should extend that dialog with **entity** groups; keep the sidebar filter as local nav narrowing.

## Decisions

### Alternatives considered

| Option                                           | Pros                           | Cons                                           |
| ------------------------------------------------ | ------------------------------ | ---------------------------------------------- |
| Overview combobox only                           | Already shipped                | Hidden on other pages; destinations only       |
| Per-list URL search only                         | Precise filters                | No cross-entity jump                           |
| Client fan-out of many list queries              | No new API                     | Latency, inconsistent limits, hard to rank     |
| Single admin search field returning grouped hits | One round-trip; server caps    | New API; grows with entities                   |
| Postgres full-text index                         | Better ranking at scale        | Overkill for admin volume                      |
| Dedicated search results page                    | Shareable URL                  | Extra hop vs palette                           |
| Chrome trigger + command dialog + unified search | Familiar; available everywhere | Needs command UI primitive; keyboard conflicts |

### Chosen

Chrome trigger + command dialog + one admin search field returning typed hit groups (pages filtered client-side from nav catalog; entities
from server). Debounce ~200–300 ms. Cap hits per group; optional “View all in list…” deep-linking to list `q` where supported.

## Next steps

- Minimum query length and debounce values.
- Whether ⌘K appears in dialog footer help.
- Default sort within groups (match each list’s default).
- Keyboard shortcut when focus is in text fields or the assistant composer.

## Implementation

**Partial** — pages dialog + sidebar filter shipped; entity groups still planned.

### UI (shipped)

- shadcn **Command** under `src/web/components/base/command.tsx` (`cmdk`).
- `AdminPagesCommandDialog`: destination-only palette from `adminNavPages()`.
- `AdminSidebarNavFilter`: sticky filter under logo; shortcut chip opens the dialog.
- ⌘K / Ctrl+K registered in `AdminSidebar` (toggles the dialog).

### UI (still planned)

- `AdminGlobalSearch`: debounced query, entity groups, navigation on select.
- Search icon ghost button in `AdminPageChrome` (left of assistant toggle), bilingual `aria-label`.
- Skip shortcut when inappropriate (e.g. assistant composer focused).
- Reuse sidebar/catalog icons for entity group rows.

### GraphQL (sketch)

Grouped result type on admin namespace, e.g. `globalSearch(text, takePerGroup)` returning users, booking requests, cities, web pages. Empty
or short text → empty entity groups. Prefer grouped fields over a flat union for v1 mapping into command groups.

### Server

- Query module `adminGlobalSearchFindMany` (or similar) under `src/server/queries/`.
- Reuse criterion / `ilike` helpers from existing admin list queries.
- `takePerGroup` default 5, hard max ~10.
- Resolvers only in `resolversCreate.ts`; gate via nullable admin probe.
- Return existing admin GraphQL mappers — no parallel hit types unless UI needs search-only fields.

### Client

- Colocate `AdminGlobalSearch.graphql` next to the component.
- Pause query until text meets minimum length; empty open shows **Pages** only (client-filtered).

### Pages group

Destination matching stays **client-side** from `adminNavPages()` so navigation works without a round-trip.

### Docs / shell when shipping

- Update [admin-shell.md](./admin-shell.md): chrome search; overview combobox disposition.
- Update [documentation.md](../documentation.md) if needed.

### Out of scope (v1)

- Public / cook / customer shells.
- Natural-language or AI-assisted search.
- Message bodies, log payloads, or email HTML.
- Replacing per-list filters — lists keep `q` / tabs; palette is a jump tool.
