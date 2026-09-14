# Admin web pages

Operators edit bilingual SEO titles and meta descriptions for fixed public routes without redeploying. Missing database rows use shared
defaults until first write.

## Behavior

### Catalog

Every known fixed route key is part of the product enum. Admins always see the full list, including keys that have never been written
(**ghost** / not configured). Ghost rows show shared SEO defaults. Saving a ghost creates the database row; later saves update it.

### Public and chrome routes

Fixed routes (landing, cities, partners, occasions, chefs, blog list, about, gift card, chef recruitment, booking surfaces, chef sign-up,
legal pages, sign-in, profile and admin layout shells, etc.) load **document title and meta description** from the web-pages store by stable
key.

Visible H1 and marketing copy stay on page modules — SEO can differ from on-page headlines. Empty English fields fall back to German.
Missing rows use shared defaults from `webPageDefaults`. Dynamic city, partner, occasion, and blog detail pages keep entity-owned SEO.
Account routes at `/profile/account` and `/admin/account` use hardcoded noindex SEO and are not in the catalog.

### Admin `/admin/web-pages`

List shows every key as a shared admin list card with bilingual label, current-locale title (stored or default), ghost badge when not
persisted, and last updated when persisted. A debounced search field filters the in-memory list by label, key, or title. Detail per key
edits DE/EN title and description with a pinned Save footer (`AdminPinnedFooterLayout`); first save upserts. Live updates via admin updates
seed-and-subscribe (no refetch after save).

## Decisions

### Alternatives considered

| Option                                        | Notes                                                                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardcoded consts only                         | Admins need deploy to tune SEO                                                                                                                     |
| Full CMS for every route                      | Overkill for title + description                                                                                                                   |
| Visit analytics on same table                 | Out of scope — visits live on `SessionEvents` ([session-events.md](../architecture/session-events.md), [admin-analytics.md](./admin-analytics.md)) |
| Seed all keys on migrate                      | Ghost merge keeps defaults clear without seed noise                                                                                                |
| Fixed GraphQL enum + create-on-write (chosen) | Keys require a code change anyway; admin always sees all keys                                                                                      |

### Chosen

Primary-keyed web page rows with German/English title and description columns. Admin list merges the enum with the table. First write
upserts. Public loaders resolve SEO per route key, falling back to shared defaults when the row is missing.

## Implementation

- Shared keys + defaults: `src/shared/webPage.ts`
- Schema: `WebPages` (`webPageKey`, title/description DE/EN, `updatedAt`)
- GraphQL: `WebPageKey` enum; `AdminWebPage` (`persisted`, nullable `updatedAt`); admin list/detail always return every key; public
  `findOne` by key; `AdminMutation.webPageUpdate` upserts
- Server: `adminWebPageFindMany` (merge), `adminWebPageFindOne` (ghost), `adminWebPageUpdate` (upsert), `publicWebPageFindOne` (defaults
  fallback), `toGqlAdminWebPage` / `toGqlAdminWebPageGhost`
- Admin UI: `AdminWebPagesPage`, `AdminWebPagePage`, labels in `adminWebPages.ts`
- Public: fixed route loaders + `head()` via locale text helper

Key files: `src/shared/webPage.ts`, `src/server/commands/adminWebPageUpdate.ts`, admin page components.

See [discovery-seo.md](../architecture/discovery-seo.md), [content-model.md](../architecture/content-model.md),
[admin-shell.md](./admin-shell.md), [admin-feature-toggles.md](./admin-feature-toggles.md) (same ghost / create-on-write pattern).
