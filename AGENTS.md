# Agents

This file is the project's working agreement for coding agents. [`CLAUDE.md`](./CLAUDE.md) is a symlink to it.

## Prime Directive

**Follow the docs. Update the docs.**

Before writing any code, read the relevant documentation in `docs/`. After implementing a feature or refactoring, update the docs to reflect
the change. Drift between docs and code is a bug.

## Before You Start

1. Read `docs/conventions.md` — follow every convention without exception
2. Read `docs/documentation.md` — understand where docs live and what goes where
3. Read the relevant `docs/architecture/*.md` files for the area you are working in
4. Read the relevant `docs/features/*.md` files when the task touches a shipped surface
5. Read `docs/infrastructure.md` if your change affects deployment, CI, or environment variables
6. Read the relevant `docs/styles/*.md` files when the task touches presentation, motion, chat UI, or email

## Working Boundaries

- **Do not create new branches** unless the user explicitly asks you to. Work on the currently checked-out branch.
- **Do not create or switch into a git worktree** unless the user explicitly asks for one. Never invoke `EnterWorktree`, `git worktree add`,
  or spawn an agent with `isolation: "worktree"` on your own initiative.
- **Do not commit or push** unless the user explicitly asks. If the current branch auto-deploys (e.g. via Coolify), stop and ask before
  committing — even when the user requested a commit.
- If you think a branch or worktree would genuinely help (e.g. parallel agents that would otherwise conflict), surface that as a suggestion
  and wait for approval before acting.

## Conventions (Summary)

These are non-negotiable. The full details are in `docs/conventions.md`.

- **Package manager**: npm only. Never use yarn or pnpm.
- **Forms**: multi-field edit/create surfaces use `@tanstack/react-form` (`useForm` + `form.Field`) — see
  [docs/conventions.md](./docs/conventions.md#forms-tanstack-form).
- **Naming**: entity-action (`sessionUpsert`, `userFindOne`, `toGqlSession`, `guardUserSubscription`); pages use singular/plural cardinality
  (`AdminUsersPage` / `AdminUserPage`) and shell prefixes (`Admin…`, `ProfileCook…`, `ProfileCustomer…`) — see
  [docs/conventions.md](./docs/conventions.md#page-component-naming)
- **Generated files — do not edit**: `src/routeTree.gen.ts`, `src/server/graphql/generated.ts`, `src/web/graphql/generated.ts`, `drizzle/`
- **Icons**: Lucide React only (`lucide-react`)
- **UI components**: base primitives in `src/web/components/base/`, app components in `src/web/components/`. **Search that tree (and any
  relevant `docs/styles/*.md`) before creating a new component** — reuse or extend what exists; only add a new file when nothing covers the
  job. See [docs/conventions.md](./docs/conventions.md#ui-components).
- **Class merging**: use `cn()` from `src/web/utils/cn.ts`
- **Motion**: every animation must answer a question the user is already asking — see [docs/styles/motion.md](./docs/styles/motion.md) for
  the guardrails, anti-patterns, and reduced-motion stance. No motion library; reuse `Reveal` / `useInView`.
- **Chat presentation**: every chat surface follows [docs/styles/chat.md](./docs/styles/chat.md).
- **GraphQL schema**: SDL-first in `src/server/graphql/schema.graphqls`. Run `npm run graphql:generate` after any schema change.
- **Resolver wiring**: all in `src/server/graphql/resolversCreate.ts` — the only file that imports from commands/, queries/, and guards/
- **Commands**: two-phase writes — build all insert/update payloads first (pure), then run DB work in try/catch (transaction when
  multi-write). See [docs/conventions.md](./docs/conventions.md#commands-database-writes).
- **Environment variables**: never read `process.env` directly — only via `environmentVariablesCreate()`. See
  [docs/architecture/environment.md](./docs/architecture/environment.md).
- **Bilingual copy**: DE + EN via the inline `{ de: '…', en: '…' }[locale]` literal **at the call site** — no i18n library and no page-level
  `COPY` const. Hoist a small named const only for strings reused within the file (e.g. shared by `seoMeta()` and the `<h1>`) or needed
  outside JSX (`aria-label`, `alt`, JSON-LD). Never render raw `error.message` in the UI. No em dashes (`—`) in user-facing copy (prefer
  commas, periods, colons). See [docs/architecture/i18n.md](./docs/architecture/i18n.md) and
  [docs/conventions.md](./docs/conventions.md#bilingual-copy).
- **SEO**: every public page uses `seoMeta()` and is listed in `src/web/seo/sitemapRoutes.ts` when indexable. Private / transactional pages
  pass `noindex: true` and stay out of the sitemap.
- **Jobs**: handlers in `src/server/jobs/handlers/`, registered in `jobDefinitions.ts`; enqueue via `serverRuntime.jobs.enqueue()`.
- **Comments**: only comment if there is no other way to make the code self-explanatory — prefer better names, smaller functions, and
  clearer types
- **Quality checks**: run `npm run check` and `npm test` before considering any task complete

## Architecture at a Glance

One row per doc under `docs/architecture/`. Feature behavior lives in `docs/features/` — do not duplicate it here. Presentation rules live
in `docs/styles/`.

| Concern                               | Doc                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------- |
| Server-side structure                 | [`server-architecture.md`](./docs/architecture/server-architecture.md)     |
| Dependency injection                  | [`dependency-injection.md`](./docs/architecture/dependency-injection.md)   |
| Environment variables                 | [`environment.md`](./docs/architecture/environment.md)                     |
| Authentication                        | [`authentication.md`](./docs/architecture/authentication.md)               |
| Authorization                         | [`authorization.md`](./docs/architecture/authorization.md)                 |
| Admin access                          | [`authorization-admin.md`](./docs/architecture/authorization-admin.md)     |
| API layer                             | [`api-layer.md`](./docs/architecture/api-layer.md)                         |
| State synchronization                 | [`state-synchronization.md`](./docs/architecture/state-synchronization.md) |
| Jobs                                  | [`jobs.md`](./docs/architecture/jobs.md)                                   |
| Browser capture (Playwright)          | [`browser-capture.md`](./docs/architecture/browser-capture.md)             |
| Stripe Connect payments               | [`stripe-payment.md`](./docs/architecture/stripe-payment.md)               |
| Testimonials / reviews                | [`testimonials.md`](./docs/architecture/testimonials.md)                   |
| Booking requests / offers             | [`booking.md`](./docs/architecture/booking.md)                             |
| Outbound email tracking               | [`outbound-email.md`](./docs/architecture/outbound-email.md)               |
| WhatsApp (Meta Cloud API)             | [`whatsapp.md`](./docs/architecture/whatsapp.md)                           |
| Persistent logging                    | [`logging.md`](./docs/architecture/logging.md)                             |
| Observability (OTel / Langfuse / APM) | [`observability.md`](./docs/architecture/observability.md)                 |
| Session events (analytics)            | [`session-events.md`](./docs/architecture/session-events.md)               |
| Go-live data migration                | [`go-live-data-migration.md`](./docs/features/go-live-data-migration.md)   |
| Go-live cutover gaps                  | [`go-live-cutover-gaps.md`](./docs/features/go-live-cutover-gaps.md)       |
| SEO                                   | [`discovery-seo.md`](./docs/architecture/discovery-seo.md)                 |
| AI-search (GEO)                       | [`discovery-geo.md`](./docs/architecture/discovery-geo.md)                 |
| Content model                         | [`content-model.md`](./docs/architecture/content-model.md)                 |
| Content sections                      | [`content-sections.md`](./docs/architecture/content-sections.md)           |
| File storage                          | [`file-storage.md`](./docs/architecture/file-storage.md)                   |
| i18n                                  | [`i18n.md`](./docs/architecture/i18n.md)                                   |
| Chat foundation                       | [`chat.md`](./docs/architecture/chat.md)                                   |
| Chat persistence                      | [`chat-persistence.md`](./docs/architecture/chat-persistence.md)           |
| Agent delegation                      | [`agent-delegation.md`](./docs/architecture/agent-delegation.md)           |
| E2e (Playwright UI)                   | [`e2e.md`](./docs/architecture/e2e.md)                                     |
| Motion                                | [`styles/motion.md`](./docs/styles/motion.md)                              |
| Theme (light-only)                    | [`styles/theme.md`](./docs/styles/theme.md)                                |
| Status messaging                      | [`styles/status-messaging.md`](./docs/styles/status-messaging.md)          |
| Copy (voice)                          | [`styles/copy.md`](./docs/styles/copy.md)                                  |
| Fonts                                 | [`styles/fonts.md`](./docs/styles/fonts.md)                                |
| Emails                                | [`styles/emails.md`](./docs/styles/emails.md)                              |
| Chat experience                       | [`styles/chat.md`](./docs/styles/chat.md)                                  |
| Navigation progress                   | [`styles/navigation-progress.md`](./docs/styles/navigation-progress.md)    |
| One-shot AI generations               | [`ai-generations.md`](./docs/architecture/ai-generations.md)               |

## How to Add Things

### New Database Table

1. Define in `src/server/db/schema.ts` with `pgTable()`
2. Export inferred types: `type Foo = typeof foo.$inferSelect`, `type FooCreate = typeof foo.$inferInsert`
3. Generate migration: `npm run db:generate`
4. Apply migration: `npm run db:migrate` (or `npm run db:push` for quick dev iteration)

### New GraphQL Operation

1. Add types/fields to `src/server/graphql/schema.graphqls`
2. Run `npm run graphql:generate`
3. Implement the command (mutation) or query in `src/server/commands/` or `src/server/queries/`
4. Add a mapper in `src/server/mappers/` if transforming DB types to GraphQL types
5. Wire the resolver in `src/server/graphql/resolversCreate.ts`
6. For protected operations, add a guard in `src/server/guards/` and call it in the resolver
7. Add the client-side `.graphql` operation file alongside the page or component under `src/web/pages/` / `src/web/components/`

### New Public Page

1. Add the page component under `src/web/pages/` (and its `.graphql` operations next to it when needed)
2. Add a thin route under `src/routes/{-$locale}/` that wires `loader` / `head` / search and renders the page (the `{-$locale}` segment
   makes the page bilingual at `/page` and `/en/page`)
3. Use `seoMeta()` in the route `head()` with bilingual `title` / `description` (export shared title/description consts from the page module
   when the page UI also needs them)
4. **Add the path to `src/web/seo/sitemapRoutes.ts`** if it should be indexed
5. Bilingual page copy uses the `{ de: '…', en: '…' }[locale]` pattern
6. See [docs/architecture/discovery-seo.md](./docs/architecture/discovery-seo.md); when GEO surfaces exist, also mirror
   [docs/architecture/discovery-geo.md](./docs/architecture/discovery-geo.md)

### New Background Job

1. Add a handler in `src/server/jobs/handlers/{entityAction}.ts` exporting a `RecurringJobDefinition` or `QueuedJobDefinition`
2. Register it in `src/server/jobs/jobDefinitions.ts`
3. Re-export from `src/server/jobs/index.ts` if callers need it
4. Enqueue queued jobs via `serverRuntime.jobs.enqueue(definition, data, options)`
5. See [docs/architecture/jobs.md](./docs/architecture/jobs.md) for the full recipe

### New Agent Tool

1. Prefer colocating the AI-SDK `tool()` wrapper on the command it wraps (under `src/server/commands/`), not a separate `agents/toolX.ts`
2. For multi-domain assistants, add or extend a sub-agent and a `delegateTo…` tool on the orchestrator — see
   [docs/architecture/agent-delegation.md](./docs/architecture/agent-delegation.md)
3. Wire tools into the relevant agent factory under `src/server/agents/`
4. Update the matching `docs/features/` doc (and architecture docs if the pattern changes)

### New Feature

1. Implement following the patterns above
2. Create a feature doc in `docs/features/{feature-name}.md` using the template in [docs/documentation.md](./docs/documentation.md#features)
   (Behavior → Decisions → Next steps / Ideas → Implementation). Keep everything above `## Implementation` product-only (admin-AI safe); put
   schema, GraphQL, commands, and file paths below the cut. details

### New Architectural Decision

1. Create a doc in `docs/architecture/{decision-name}.md` covering: context, decision, alternatives considered, consequences
2. Add a row to the Architecture table above

## Documentation Update Rules

You MUST update documentation when any of the following occur:

| What Changed                          | What to Update                               |
| ------------------------------------- | -------------------------------------------- |
| New feature implemented               | Add `docs/features/{feature}.md`             |
| New convention established            | Update `docs/conventions.md`                 |
| New architectural pattern introduced  | Add `docs/architecture/{pattern}.md`         |
| Presentation / motion / chat UI bar   | Update the relevant `docs/styles/*.md`       |
| Existing architecture changed         | Update the relevant `docs/architecture/*.md` |
| Deployment or CI changed              | Update `docs/infrastructure.md`              |
| File renamed, moved, or deleted       | Update any doc that references it            |
| Environment variable added or changed | Update `docs/infrastructure.md`              |

If you are unsure whether a doc needs updating, it does.

## Project Structure

```txt
src/
├── routes/          TanStack Router thin wrappers (loader / head / search, api/, server/)
├── server/          CQRS (commands/, queries/, guards/, mappers/), agents/, jobs/, graphql/, db/, env/, domain/ (runtime + entity types)
├── web/             UI (pages/, components/, sections/, hooks/, seo/, chat/), GraphQL client, utils/ — no imports from server/db or server/domain
├── shared/          Isomorphic helpers (locale, date/currency formatting) used by web + server
├── router.tsx
├── routeTree.gen.ts Generated (DO NOT EDIT)
└── styles.css

docs/
├── conventions.md       Working agreements
├── documentation.md     What goes where under docs/
├── infrastructure.md    Deploy, CI, env vars
├── architecture/        Structural decisions (see table above)
├── styles/              Presentation / interaction rules (motion, chat, …)
└── features/            Shipped feature docs
```

## Tech Stack

- **Runtime**: Node.js, TypeScript 6
- **Frontend**: React 19, TanStack Router + Start, URQL, Tailwind CSS 4, shadcn/Radix UI
- **Backend**: Apollo Server 5, Drizzle ORM, PostgreSQL
- **Real-time**: graphql-sse (SSE), PostgreSQL NOTIFY/LISTEN
- **Validation**: Zod 4
- **AI**: Vercel AI SDK
- **Testing**: Vitest, Playwright
- **Build**: Vite 8
- **CI**: GitHub Actions
- **Deployment**: Docker via Coolify
