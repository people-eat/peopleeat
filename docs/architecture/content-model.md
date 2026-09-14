# Content Model: DB-backed lists + static identity

## Context

Product content usually comes in two flavours:

1. **Identity / rarely changing facts** — brand name, contact handles, a short about blurb. These change rarely. Editing through an admin UI
   is overhead for fields nobody will touch often.
2. **Editable list content** — timeline entries, projects, blog posts, catalog items. These grow over time and need an admin surface so
   adding a new one is minutes, not a PR + redeploy.

Treating both the same way ends in pain on whichever side you compromise: a CMS table for the brand blurb is overkill, and a static config
file for a frequently updated list is friction every edit.

## Decision

Split by editing cadence:

- **Static**: typed config file under `src/web/content/` (when a fork needs it). Read directly from both server and client (pure data, no
  runtime). Edited via PR. Example illustration: a `personalInfo.ts` / `siteIdentity.ts` module holding brand and contact facts.
- **DB-backed**: Drizzle table + CQRS layer (queries, commands, mappers, resolver) + admin form under a privileged route. Example
  illustrations: a public CV/timeline table pair, a projects board, a media library — none of these are required by the template itself.

## Alternatives Considered

| Option                          | Why rejected                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Everything in the DB / CMS      | Identity facts almost never change; admin UI + migrations are overhead              |
| Everything in static files      | Growing lists need fast edits without a PR + redeploy                               |
| Headless CMS (Contentful, etc.) | Extra vendor, auth surface, and sync for many single-operator / small-team products |

## Consequences

- Agents and humans must pick the right store up front — moving a field later means a migration or a content rewrite.
- Public bilingual lists pay the `*De` / `*En` typing cost; admin-only lists may skip it (see below).
- Conventions below are the day-to-day shape of DB-backed lists; feature docs cover each surface's behaviour.

## Conventions for DB-backed editable lists

A new editable-list domain follows the same shape every time:

1. **Schema** — uuid PK, paired `*De` / `*En` text columns for any bilingual field, an integer `position` column for ordering, `createdAt` /
   `updatedAt` timestamps. Postgres `text[]` for inline label arrays when labels are display-only and never queried by relation.
2. **GraphQL** — public reads under a dedicated namespace field (e.g. `publicThingFindOne: ThingQuery!`); admin reads/writes under
   `User.admin` / `Mutation.admin` with the usual `<entity>Upsert` / `Delete` / `Reorder` triple when an admin gate exists (see
   [authorization-admin.md](./authorization-admin.md)). Bilingual columns surface as paired `*De` / `*En` GraphQL fields — the client picks
   per-locale at render time. Do **not** invent a free-floating `Query.<thing>` namespace for new domains.
3. **Server** — one query file per list, command files per write (`Upsert` / `Delete` / `Reorder`), one mapper. All wired in
   `src/server/graphql/resolversCreate.ts`.
4. **Read pages** — public route loads through `routeLoaderGraphqlClient`, renders with a presentational component that knows nothing about
   GraphQL.
5. **Admin page** — privileged route, `noindex`, gated server-side. Prefer one inline form open at a time and a single list query driving
   the UI.

### Free-form SEO pages (cities / partners / occasions / blog)

Ordered bilingual section blocks for landing pages and articles use the shared model in [`content-sections.md`](./content-sections.md) — one
Zod/GraphQL/UI stack, four thin entity tables — not a separate CMS product.

### When a field is not actually bilingual

The `*De` / `*En` pair is for **translatable prose**. **Proper nouns** that read the same in both locales (company names, product names,
skill labels like `TypeScript`) live on a single untranslated column. The rule: **if the German and English values would be identical for
every row you can imagine, drop the pair**.

## Conventions for static identity content

1. **Location** — `src/web/content/<name>.ts`. Under `web/` so the client can import it without going through the server-only bundle
   splitter; the server can still import it.
2. **Shape** — single typed export, no runtime, no env reads. Bilingual fields use `{ de, en }` literals matching the inline copy pattern.
3. **Public visibility** — when a static file holds mixed public/private fields, include a `publicVisibility` record so consumers branch on
   a flag instead of duplicating the literal data.

## Reorder semantics

`<entity>Reorder` takes the full id array in the desired order and rewrites every `position` in a transaction. It is not delta-based — the
client always sends the canonical order. A transaction means a network failure mid-reorder leaves the list in its prior order rather than
with duplicate positions.

## When NOT to use DB-backed content

- **Stable identity facts** — `src/web/content/`.
- **Generated content** — sitemaps, OG images, etc. Derived from data already in the system.
- **Per-request derivations** — anything you'd cache for under a minute.

## When NOT to use static content

- **Anything an admin will edit more than twice a year.** Static edits ship through CI; right weight for a phone number, wrong weight for a
  frequently updated list entry.

## When a DB-backed list skips bilingual columns

The `*De` / `*En` pair is the rule for surfaces visitors render. **Admin-only** surfaces may drop the pair when rows never appear on a
public, locale-switched page — single `title` / `description` columns are enough. Public-facing tables that feed locale routes stay
bilingual.
