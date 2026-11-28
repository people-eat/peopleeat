# Admin web pages

Operators edit German, English, and Dutch SEO titles and meta descriptions for fixed public routes without redeploying. Missing database
rows use shared defaults until first write.

## Behavior

### Catalog

Every known fixed route key is part of the product enum. Admins always see the full list, including keys that have never been written
(**ghost** / not configured). Ghost rows show shared SEO defaults. Saving a ghost creates the database row; later saves update it.

### Public and chrome routes

Fixed routes (landing, cities, venues, occasions, chefs, blog list, about, gift card, chef recruitment, booking surfaces, chef sign-up,
legal pages, sign-in, profile and admin layout shells, etc.) load **document title and meta description** from the web-pages store by stable
key.

Visible H1 and marketing copy stay on page modules — SEO can differ from on-page headlines. Empty English fields fall back to German. Empty
Dutch fields fall back to catalog `*.seo.*` when that route has catalog SEO, otherwise English, then German. Missing rows use shared
defaults from `webPageDefaults`. Dynamic city, venue, occasion, and blog detail pages keep entity-owned SEO. Account routes at
`/profile/account` and `/admin/account` use hardcoded noindex SEO and are not in the catalog.

### Admin `/admin/web-pages`

List shows every key as a shared admin list card with bilingual label, current-locale title (stored or default), ghost badge when not
persisted, a 30-day human visit count, and last updated when persisted. A debounced search field filters the in-memory list by label, key,
or title. Detail per key edits DE/EN/NL title and description with a pinned Save footer (`AdminPinnedFooterLayout`) that appears only while
the form is dirty; first save upserts. Tracked keys show a 90-day human pageviews line chart and a **View traffic** link to
[admin-traffic.md](./admin-traffic.md) with that key and the same 90-day window. English and Dutch cards show **Translate from German** when
German is filled and that locale still has an empty title or description; the mutation fills only empty fields and does not save. Live
updates via admin updates seed-and-subscribe (no refetch after save; dirty edits are not overwritten). Visit counts and the chart come from
the initial loader, not the SEO subscription.

## Decisions

### Alternatives considered

| Option                                        | Notes                                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Hardcoded consts only                         | Admins need deploy to tune SEO                                                                       |
| Full CMS for every route                      | Overkill for title + description                                                                     |
| Visit analytics on same table                 | Rejected — visits stay on `SessionEvents`; Web Pages links to [admin-traffic.md](./admin-traffic.md) |
| Per-language traffic series on this page      | Rejected for now — `WEB_PAGE_VISITED` stores a locale-stripped path, so language is not on the visit |
| Seed all keys on migrate                      | Ghost merge keeps defaults clear without seed noise                                                  |
| Fixed GraphQL enum + create-on-write (chosen) | Keys require a code change anyway; admin always sees all keys                                        |

### Chosen

Primary-keyed web page rows with German, English, and Dutch title and description columns. Admin list merges the enum with the table. First
write upserts. Public loaders resolve SEO per route key, falling back to shared defaults when the row is missing. A 90-day sparkline on the
detail page is a shortcut into Traffic, not a second explorer. FR/IT/RU chrome SEO stays in catalogs.

## Implementation

- Shared keys + defaults: `src/shared/webPage.ts`
- Schema: `WebPages` (`webPageKey`, title/description DE/EN/NL, `updatedAt`)
- GraphQL: `WebPageKey` enum; `AdminWebPage` (`persisted`, nullable `updatedAt`); admin list/detail always return every key; public
  `findOne` by key; `AdminMutation.webPageUpsert`; `AdminMutation.webPageSeoTranslate`
- Server: `adminWebPageFindMany` (merge), `adminWebPageFindOne` (ghost), `adminWebPageUpsert`, `adminWebPageSeoTranslate`,
  `publicWebPageFindOne` (defaults fallback), `toGqlAdminWebPage` / `toGqlAdminWebPageGhost`
- Admin UI: `AdminWebPagesPage`, `AdminWebPagePage`, labels in `adminWebPages.ts`
- Public: fixed route loaders + `head()` via `webPageSeoText`

Key files: `src/shared/webPage.ts`, `src/server/commands/adminWebPageUpsert.ts`, `src/server/commands/adminWebPageSeoTranslate.ts`, admin
page components.

See [discovery-seo.md](../architecture/discovery-seo.md), [content-model.md](../architecture/content-model.md),
[admin-shell.md](./admin-shell.md), [admin-feature-toggles.md](./admin-feature-toggles.md) (same ghost / create-on-write pattern),
[admin-traffic.md](./admin-traffic.md).
