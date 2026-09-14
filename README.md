# peopleeat

Private chef booking platform — customers send booking requests, cooks reply with offers, and menus are built in a configurator attached to
those offers.

**Stack:** TanStack Start + React 19 · Apollo Server + URQL (SDL-first GraphQL) · Drizzle ORM + PostgreSQL · graphql-sse + PG NOTIFY/LISTEN
· pg-boss · Vercel AI SDK · Tailwind 4 + shadcn/Radix · Vitest + Playwright · Storybook · Docker via Coolify.

> **For coding agents:** working agreement in [`AGENTS.md`](./AGENTS.md) / [`CLAUDE.md`](./CLAUDE.md). Architecture under
> [`docs/`](./docs/). **Read the docs before writing code; update the docs after.**

---

## Quick start

```bash
# 1. Install (npm only — yarn / pnpm are blocked by package.json#engines)
npm install

# 2. Provision environment variables — see "Environment files" below
cp .env.local.example .env.local   # dev / drizzle / vite — edit, then fill secrets
cp .env.test.example  .env.test    # integration-test DB — point at a separate DB

# 3. Set up the database
npm run db:push              # quick dev: pushes schema directly
# or: npm run db:migrate     # apply committed migrations

# 4. Run the dev server
npm run dev                  # http://localhost:3000

# 5. Before pushing — run the full quality gate
npm run check                # format + lint + spell + types + knip + commitlint
npm test                     # vitest
```

---

## Environment files

The repo ships **two committed example files**; copy each to its real (gitignored) sibling on first setup. Validation rules and the full
table of variables live in [`docs/architecture/environment.md`](./docs/architecture/environment.md) and
[`docs/infrastructure.md`](./docs/infrastructure.md) — this section only covers _which file holds what_.

| Committed example    | Copy to      | Loaded by                                                                                      | Holds                                                                                                                                              |
| -------------------- | ------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.local.example` | `.env.local` | Vite (`npm run dev`/`build`) and `drizzle.config.ts` (`db:push`/`migrate`/`generate`/`studio`) | All boot-required vars (`DATABASE_URL`, `sessionCookieName`, `WEB_PAGE_URL`, `VISITOR_IP_HASH_SALT`) plus the capability and optional vars you use |
| `.env.test.example`  | `.env.test`  | `src/server/test/commandTestUtils.ts` (integration tests via dotenv)                           | Just `DATABASE_URL` for a **separate** test database that the test suite is free to truncate                                                       |

Notes:

- **Unit tests do not load any `.env` file** — they pass an explicit source object to `environmentVariablesCreate()`. See
  [`docs/architecture/environment.md`](./docs/architecture/environment.md).
- **Capability vars are intentionally optional in `EnvironmentVariables`** but become required when their feature runs:
  `GOOGLE_GENERATIVE_AI_API_KEY` (chat) and `SERVER_TOKEN_SECRET` (server-side rendering).
- **Test / production** values are configured in Coolify, not in any `.env*` file. The example files exist for local dev only.

---

## Product

See [`docs/features/product-overview.md`](./docs/features/product-overview.md).

**Visual system:** light theme only — warm background `#fffdf9`, charcoal primary `#404040`, accent `#ff8a05`. Body and headings **DM Sans**
(separate tokens for a future display face). Details in [`docs/styles/theme.md`](./docs/styles/theme.md) and
[`docs/styles/fonts.md`](./docs/styles/fonts.md).

**Deploy:** pushes to `main` deploy the **test** Coolify app; merges to `production` deploy **production**. See
[`docs/infrastructure.md`](./docs/infrastructure.md).

---

## Documentation map

| Read first                                           | When                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| [`docs/conventions.md`](./docs/conventions.md)       | Always. Naming, two-phase commands, generated files, testing patterns. |
| [`docs/documentation.md`](./docs/documentation.md)   | Before adding a doc — so you put it in the right place.                |
| [`docs/infrastructure.md`](./docs/infrastructure.md) | Touching deploy, CI, Dockerfile, env vars.                             |
| `docs/architecture/*.md`                             | Working in that area (api-layer, jobs, chat, auth, file-storage, …).   |
| `docs/styles/*.md`                                   | Presentation rules (theme, fonts, motion, chat, navigation-progress).  |
| `docs/features/*.md`                                 | Working on a shipped (or planned) feature.                             |

---

## Common commands

```bash
npm run dev                  # vite dev server, port 3000
npm run build                # vite + nitro production build into .output/
npm test                     # vitest
npm run check                # full quality gate — must pass before push
npm run db:generate          # drizzle-kit migration from schema.ts
npm run db:migrate           # apply committed migrations
npm run db:push              # push schema directly (dev only)
npm run db:studio            # drizzle studio
npm run graphql:generate     # regenerate GqlS*/GqlC* types from schema.graphqls
npm run storybook            # storybook dev, port 6006
```
