# Admin global search

Evolve the shipped ⌘K / Ctrl+K admin command dialog from **pages-only** jumps into a capable palette that also finds **entities** (users,
booking requests, and more) from any admin screen — without hunting the sidebar or per-list filters.

## Behavior

### Shipped today

1. **Trigger** — Sticky sidebar filter under the logo; shortcut chip or **⌘K / Ctrl+K** opens `AdminPagesCommandDialog`.
2. **Dialog** — Command-style overlay (`cmdk`): search input focused on open, grouped results, Esc or backdrop closes. Selected row uses the
   same soft accent highlight as select / combobox (`bg-accent/15`), with `cursor-pointer`.
3. **Query** — Client-side filter over destination titles from `adminNavPages()` (same catalog as the overview destination list).
4. **Select** — Navigates to that admin path and closes the dialog.

Sidebar filter stays separate: it only narrows visible nav links; it does not search entities.

### Target (evolve the same dialog)

Keep one palette. Extend groups under the existing input rather than adding a second search UI.

1. **Pages / destinations** — unchanged client-side catalog match (works offline of the network; always available when the dialog opens).
2. **Entities** — server-backed hits as the query grows. **First wave:** users and booking requests (highest ops traffic). Then cities and
   web pages. Grow with each admin detail route as list `searchText` + deep links already exist.
3. **Select** — Row navigates to the matching admin detail (or list deep-link) and closes the dialog.
4. **Empty / loading** — Bilingual empty copy when nothing matches; brief loading while server results resolve. Never show raw API errors in
   the dialog.
5. **Chrome trigger (optional later)** — Search icon in `AdminPageChrome` (between breadcrumbs and assistant toggle) opening the **same**
   dialog.

### Result groups (first entity wave)

| Group            | Match on (examples)                                 | Navigate to            |
| ---------------- | --------------------------------------------------- | ---------------------- |
| Pages            | Title, keywords, description from admin nav catalog | Catalog path           |
| Users            | First name, last name, email                        | User detail            |
| Booking requests | Occasion, customer name/email, request id           | Booking request detail |

### Later groups

Cities, web pages, partners, occasions, blog posts, gift cards, promo codes, sessions, logs, outbound emails, meals, menus, support
requests, WhatsApp conversations — each as its own group when list search criteria and deep links exist. Prefer reusing existing list
`searchText` patterns rather than parallel queries.

## Decisions

### Alternatives considered

| Option                                           | Pros                           | Cons                                           |
| ------------------------------------------------ | ------------------------------ | ---------------------------------------------- |
| Overview combobox only                           | Already shipped                | Hidden on other pages; destinations only       |
| Per-list URL search only                         | Precise filters                | No cross-entity jump                           |
| New dialog beside pages palette                  | Isolates risk                  | Two shortcuts / two UIs; users won't discover  |
| Client fan-out of many list queries              | No new API                     | Latency, inconsistent limits, hard to rank     |
| Single admin search field returning grouped hits | One round-trip; server caps    | New API; grows with entities                   |
| Postgres full-text index                         | Better ranking at scale        | Overkill for admin volume                      |
| Dedicated search results page                    | Shareable URL                  | Extra hop vs palette                           |
| Evolve ⌘K dialog + unified search (chosen)       | Familiar; available everywhere | Needs entity API; keyboard conflicts           |

### Chosen

**Evolve `AdminPagesCommandDialog` in place** into global search: pages stay client-filtered from the nav catalog; entities come from one
admin search field returning typed hit groups. Debounce ~200–300 ms. Cap hits per group; optional “View all in list…” deep-linking to list
`q` where supported. Rename / extract to `AdminGlobalSearch` when entity groups land if the pages-only name no longer fits.

## Next steps

- Ship users + booking-request groups first (reuse list `searchText` / criterion helpers).
- Minimum query length and debounce values for the entity query (pages can keep filtering from the first character).
- Whether ⌘K appears in dialog footer help.
- Default sort within groups (match each list’s default).
- Keyboard shortcut when focus is in text fields or the assistant composer (skip when inappropriate).
- Optional chrome search icon wiring to the same dialog.

## Ideas

- Rank across groups (e.g. exact email / request id above fuzzy title matches).
- Recent destinations / recent entities at the top when the query is empty.
- Natural-language or AI-assisted search (out of scope for v1; see assistants).

## Implementation

**Partial** — pages dialog + sidebar filter shipped; entity groups still planned.

### UI (shipped)

- shadcn **Command** under `src/web/components/base/command.tsx` (`cmdk`).
- `AdminPagesCommandDialog`: destination-only palette from `adminNavPages()`.
- `AdminSidebarNavFilter`: sticky filter under logo; shortcut chip opens the dialog.
- ⌘K / Ctrl+K registered in `AdminSidebar` (toggles the dialog).

### UI (still planned)

- Extend the dialog (or rename to `AdminGlobalSearch`): debounced entity query, users + booking-request groups first, navigation on select.
- Optional search icon ghost button in `AdminPageChrome` (left of assistant toggle), bilingual `aria-label`.
- Skip shortcut when inappropriate (e.g. assistant composer focused).
- Reuse sidebar/catalog icons for entity group rows.

### GraphQL (sketch)

Grouped result type on admin namespace, e.g. `globalSearch(text, takePerGroup)` returning users, booking requests, then later cities, web
pages, …. Empty or short text → empty entity groups (pages still filter client-side). Prefer grouped fields over a flat union for v1
mapping into command groups.

### Server

- Query module `adminGlobalSearchFindMany` (or similar) under `src/server/queries/`.
- Reuse criterion / `ilike` helpers from existing admin list queries (`adminUsers`, booking-request list, …).
- `takePerGroup` default 5, hard max ~10.
- Resolvers only in `resolversCreate.ts`; gate via nullable admin probe.
- Return existing admin GraphQL mappers — no parallel hit types unless UI needs search-only fields.

### Client

- Colocate `AdminGlobalSearch.graphql` next to the component.
- Pause entity query until text meets minimum length; empty open shows **Pages** only (client-filtered).

### Pages group

Destination matching stays **client-side** from `adminNavPages()` so navigation works without a round-trip.

### Docs / shell when shipping entity groups

- Update [admin-shell.md](./admin-shell.md): chrome search (if added); overview combobox disposition; mark entity search as shipped.
- Update [documentation.md](../documentation.md) if the feature status line changes.

### Out of scope (v1)

- Public / cook / customer shells.
- Natural-language or AI-assisted search.
- Message bodies, log payloads, or email HTML.
- Replacing per-list filters — lists keep `q` / tabs; palette is a jump tool.
