# Infrastructure

## Deployment

This project is deployed via **Coolify** as a **Docker** container.

### Docker Build

The `Dockerfile` uses a multi-stage build:

1. **deps** — Installs all dependencies with `npm ci`
2. **build** — Copies dependencies, runs `npm run build` (Vite production build via TanStack Start)
3. **runtime** — Installs only the runtime package that cannot be bundled (`playwright`), downloads Chromium + its system libraries, then
   copies the self-contained `.output/` bundle into a slim Node.js image

The `deps` stage installs the npm version declared in `package.json#packageManager` before running `npm ci`, so Docker builds resolve the
lockfile with the same npm version as CI. It strips `scripts.prepare` (husky) and `scripts.postinstall` (`npm dedupe`) before installing —
neither is useful in the image, and Playwright's postinstall would try to fetch browsers (Chromium is installed only in the runtime stage).
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is a second guard. A BuildKit cache mount on `/root/.npm` reuses tarballs when the lockfile changes
instead of re-downloading the whole tree. `.dockerignore` keeps tests, most of `docs/`, editor config, and similar out of the build context
so `COPY . .` in the build stage stays small. **Exception:** `docs/features/**` is whitelisted so the admin product-docs wiki
(`import.meta.glob` in `src/server/agents/productDocsWiki.ts`) can bundle feature markdown into `.output/` at build time. Architecture /
styles / other docs stay out of the image context.

**Runtime `node_modules` is a small allowlist** (not a full `npm ci --omit=dev`): `playwright` (Chromium-bidi cannot be inlined), `pg` /
`pg-pool` (Nitro-external so OTel can patch queries), and `@opentelemetry/api` + `@opentelemetry/instrumentation` + `instrumentation-http` +
`instrumentation-pg` for the `--import` preload in [`ops/observability/register.mjs`](../ops/observability/register.mjs). The runtime stage
rewrites `package.json` to those lockfile-pinned versions and runs `npm install --omit=dev`. `npm ci` cannot be used after rewriting
`package.json` (the lockfile would no longer match). See [architecture/observability.md](./architecture/observability.md).

The runtime stage then runs `npx playwright install-deps chromium` and `npx playwright install chromium` to add the system libraries
Chromium needs (fonts, libnss, libatk, ...) and download the matching Chromium build. Chromium is installed into a BuildKit cache mount
first (`id=playwright-chromium`) and copied into `/ms-playwright`, so a `package.json` change that invalidates the npm-install layer does
not re-download the multi-hundred-megabyte browser. These steps live above the `COPY --from=build /app/.output` so they also cache across
application code changes. The Debian-based `node:24-slim` base is required — Chromium's prebuilt binaries are linked against glibc and will
not run on Alpine. See [architecture/browser-capture.md](./architecture/browser-capture.md) for the full design.

The runtime stage sets `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` **before** those install steps. Playwright resolves browser binaries
relative to `$HOME/.cache/ms-playwright`, but the install runs as `root` while the container serves as `USER node` — leaving Chromium in
`/root/.cache` where the `node`-owned runtime process (searching `/home/node/.cache`) can't find it, which surfaces as
`browserType.launch: Executable doesn't exist at /home/node/.cache/ms-playwright/...`. The fixed path makes install-time and run-time agree,
and a `chmod -R a+rX /ms-playwright` after install lets the `node` user read the root-created files.

#### Build output: nitro + TanStack Start

The `tanstackStart()` Vite plugin alone emits only a fetch-handler module (`export default { fetch }`) at `dist/server/server.js`. That
module has no top-level side effects — running it under Node imports the file and exits with code 0 without ever opening a port. To produce
a real Node entrypoint, `vite.config.ts` adds the `nitro/vite` plugin alongside `tanstackStart()`. Nitro wraps the fetch handler in a
`node:http` listener that reads `PORT` and `HOST` from the environment, and emits a self-contained bundle at `.output/server/index.mjs` with
its runtime dependencies inlined. Production launches that file **after** the OTel preload:
`node --import ./ops/observability/register.mjs .output/server/index.mjs`. A Nitro runtime plugin
(`src/server/nitro/clientConnectionAbortPlugin.ts`) treats client disconnects (`ECONNRESET` / `aborted`) as expected so they do not flood
Coolify logs — see [architecture/observability.md](./architecture/observability.md#client-connection-aborts).

**Passkeys / `reflect-metadata`:** the WebAuthn stack (`@simplewebauthn/server` → `@peculiar/x509` → `tsyringe`) requires the Reflect
metadata polyfill before `tsyringe` loads. Nitro's SSR rollup can place CJS `reflect-metadata` in the importer chunk body while
`@peculiar/x509` remains a static ESM sibling import, so `tsyringe` evaluates first and every SSR `loadEntries` fails with
`tsyringe requires a reflect polyfill`. The fix lives in `vite.config.ts` (`reflectMetadataForTsyringe` on Nitro's rollup) plus a direct
`reflect-metadata` dependency and first-line imports in the passkey / GraphQL server entry modules — see
[architecture/authentication.md](./architecture/authentication.md#passkeys-webauthn).

Local `npm run dev`: `vite.config.ts` sets `server.watch.ignored` to `**/docs/**`, and `src/styles.css` has `@source not "../docs"`, so
markdown edits under `docs/` do not wake the Vite watcher or rebuild Tailwind CSS. Restart the dev server after changing either of those
settings, and after editing `docs/features/*.md` when you need the admin product-docs wiki bundle to pick up the new text.

Coolify terminates TLS at Traefik and forwards plain HTTP into the container with `X-Forwarded-Proto: https`. srvx ≥0.11.22 (pulled in via
nitro) ignores those headers unless `trustProxy` is enabled, so `Request.url` reports `http://…`. Absolute URLs derived from `request.url`
(notably the SSR → `/api/graphql` hop in `routeLoaderGraphqlClient`) must not rely on it — see
[architecture/api-layer.md](./architecture/api-layer.md#session--cookie-handover).

Nitro inlines most application runtime deps (`react`, `@tanstack/react-router`, etc.) into `.output/`, but keeps `pg` / `pg-pool` and
`playwright` external. The Docker **runtime stage still keeps `package.json` / `node_modules`** for those packages plus the OTel
instrumentation preload — see the Dockerfile notes above. Do not describe the image as "`.output` only."

```bash
docker build -t app .
docker run -p 3000:3000 \
  -e DATABASE_URL=... \
  -e sessionCookieName=... \
  -e WEB_PAGE_URL=... \
  -e VISITOR_IP_HASH_SALT=... \
  -e GOOGLE_GENERATIVE_AI_API_KEY=... \
  app
```

### Health Check

The Dockerfile declares a `HEALTHCHECK` that hits `GET /api/health` (handler at `src/routes/api/health.ts`) every 30s using Node's built-in
`fetch`. The probe reads `process.env.PORT` (falling back to `3000`) so it always targets the same port nitro is listening on — Coolify
injects its own `PORT` value, and a hardcoded port would silently fail healthcheck and cause Traefik to respond with "no available server".
The endpoint returns `{ status: 'ok', version: '<commit-sha>' }` with HTTP 200 as soon as the HTTP listener is up — it deliberately does
**not** check the database, so a transient DB outage will not flap the container or trigger restarts.

The `version` field is the commit SHA of the running build. It is baked into the image at build time via the `BUILD_SHA` Docker build arg
(see `Dockerfile`), exposed as the `BUILD_SHA` environment variable inside the container, and read through `EnvironmentVariables.buildSha`.
When the image is built without the build arg (e.g. local `docker build` without `--build-arg BUILD_SHA=...`), `version` is `"unknown"`. The
CD workflow uses this field to verify a deploy actually replaced the running container — see
[Continuous Deployment](#continuous-deployment-cd-github-actions). The Docker `HEALTHCHECK` itself only inspects the response status, not
the body, so adding the field is backward compatible.

Coolify reads the image's `HEALTHCHECK` automatically; no extra configuration is needed in the Coolify UI. If you want a stricter readiness
probe (e.g. fail when the DB is unreachable), extend the handler — but be aware Coolify will then mark the container unhealthy and may
restart it during DB blips.

### Environment Variables

The following environment variables must be configured in the deployment environment. They are validated at startup by
`src/server/env/environmentVariablesCreate.ts` — see [architecture/environment.md](./architecture/environment.md).

| Variable                                | Required | Description                                                                                                                                                                                                                                            |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                          | Yes      | PostgreSQL connection string                                                                                                                                                                                                                           |
| `sessionCookieName`                     | Yes      | Name of the cookie used to store the session ID                                                                                                                                                                                                        |
| `WEB_PAGE_URL`                          | Yes      | Absolute origin of the deployed site, no trailing slash (e.g. `https://example.com`). Drives canonical URLs, hreflang alternates, the dynamic `/sitemap.xml`, and `/robots.txt` — see [architecture/discovery-seo.md](./architecture/discovery-seo.md) |
| `VISITOR_IP_HASH_SALT`                  | Yes      | Per-deploy salt mixed into `SHA256(salt + ":" + clientIp)` before it lands in `Sessions.ipHash`. Generate with `openssl rand -hex 32`; treat as a secret — see [architecture/authentication.md](./architecture/authentication.md)                      |
| `GOOGLE_GENERATIVE_AI_API_KEY`          | Yes      | Google Generative AI API key for Gemini language models                                                                                                                                                                                                |
| `GOOGLE_PLACES_API_KEY`                 | Yes      | Google Places API (New) Text Search + Routes API driving distance (`serverRuntime.places` / `Session.locationSuggestions` / booking travel) — see [features/cook-profile.md](./features/cook-profile.md)                                               |
| `SERVER_TOKEN_SECRET`                   | Yes      | HMAC secret signing short-lived server-side render tokens for `serverRuntime.browser.capture()` against authenticated `/server/*` routes — see [architecture/browser-capture.md](./architecture/browser-capture.md)                                    |
| `AUTH_OTP_PEPPER`                       | Yes      | HMAC pepper for email OTP code hashes / TOTP recovery-code hashes; also derives the AES key for encrypted OTP reuse ciphertext                                                                                                                         |
| `AUTH_TOTP_ENCRYPTION_KEY`              | Yes      | AES-256-GCM key as 64 hex chars for TOTP secrets — see [architecture/authentication.md](./architecture/authentication.md)                                                                                                                              |
| `STRIPE_SECRET_KEY`                     | Yes      | Stripe secret key for Connect payments (`serverRuntime.stripe`) — see [architecture/stripe-payment.md](./architecture/stripe-payment.md)                                                                                                               |
| `STRIPE_WEBHOOK_SECRET`                 | Yes      | Stripe webhook signing secret (`serverRuntime.stripe.webhookEventConstruct`) — Dashboard setup + event catalog in [architecture/stripe-payment.md](./architecture/stripe-payment.md#webhooks--dashboard-setup)                                         |
| `STRIPE_PUBLISHABLE_KEY`                | Yes      | Stripe publishable key for Elements (gift-card / booking checkout)                                                                                                                                                                                     |
| `RECAPTCHA_SECRET_KEY`                  | Yes      | Google reCAPTCHA v3 secret (server verify) for gift-card purchase                                                                                                                                                                                      |
| `RECAPTCHA_SITE_KEY`                    | Yes      | Google reCAPTCHA v3 site key (browser)                                                                                                                                                                                                                 |
| `LIVEKIT_URL`                           | Yes      | LiveKit WebSocket URL (`wss://…`) for offer video calls (`serverRuntime.livekit`) — see [features/booking-request-offer-calls.md](./features/booking-request-offer-calls.md)                                                                           |
| `LIVEKIT_API_KEY`                       | Yes      | LiveKit API key (must match the self-hosted LiveKit `keys:` map and the Egress worker)                                                                                                                                                                 |
| `LIVEKIT_API_SECRET`                    | Yes      | LiveKit API secret                                                                                                                                                                                                                                     |
| `LIVEKIT_ROOM_PREFIX`                   | No       | Optional room-name prefix so multi-env DBs sharing one LiveKit cluster do not collide (default: `WEB_PAGE_URL` hostname). No LiveKit webhook — rooms end via leave + sweep job                                                                         |
| `OBJECT_STORAGE_S3_BUCKET`              | Yes      | Garage/S3 bucket for shared object storage (`serverRuntime.objectStorage`). First consumer: call-recording audio — see [architecture/file-storage.md](./architecture/file-storage.md)                                                                  |
| `OBJECT_STORAGE_S3_ENDPOINT`            | Yes      | S3 API endpoint (e.g. `https://garage-s3.example.com`). Must be reachable by the LiveKit Egress worker                                                                                                                                                 |
| `OBJECT_STORAGE_S3_REGION`              | Yes      | S3 region (must match Garage `s3_region`)                                                                                                                                                                                                              |
| `OBJECT_STORAGE_S3_ACCESS_KEY_ID`       | Yes      | Garage/S3 access key                                                                                                                                                                                                                                   |
| `OBJECT_STORAGE_S3_SECRET_ACCESS_KEY`   | Yes      | Garage/S3 secret key                                                                                                                                                                                                                                   |
| `OBJECT_STORAGE_S3_FORCE_PATH_STYLE`    | No       | Path-style addressing for Garage/Traefik (default `true`; set `false` to disable)                                                                                                                                                                      |
| `KLAVIYO_PRIVATE_API_KEY`               | Yes      | Klaviyo private API key for marketing profile sync (`serverRuntime.klaviyo`) — see [features/klaviyo-profile-sync.md](./features/klaviyo-profile-sync.md). Transactional mail stays on Resend                                                          |
| `KLAVIYO_NEWSLETTER_LIST_ID`            | No       | Optional Klaviyo list id for footer newsletter subscribe (`klaviyo.newsletterSubscribe`). When unset, subscriptions still persist in `NewsletterSubscriptions` — see [features/newsletter.md](./features/newsletter.md)                                |
| `EMAIL_TRANSPORT`                       | No       | How `serverRuntime.email.send` delivers mail: `resend` (default) or `console` (print plaintext to the server terminal). Use `console` for local/dev so OTP codes appear without Resend credentials                                                     |
| `RESEND_API_KEY`                        | Yes\*    | Resend API key for transactional email. Required at boot when `EMAIL_TRANSPORT=resend`                                                                                                                                                                 |
| `RESEND_FROM_EMAIL`                     | Yes\*    | From address for Resend (e.g. `peopleeat@mail.people-eat.com`). `serverRuntime.email.send` prefixes `SITE_NAME` as the inbox display name. Required at boot when `EMAIL_TRANSPORT=resend`                                                              |
| `RESEND_WEBHOOK_SECRET`                 | Yes\*    | Resend webhook signing secret (Svix). Required at boot when `EMAIL_TRANSPORT=resend`                                                                                                                                                                   |
| `SLACK_TRANSPORT`                       | No       | How `serverRuntime.slack` delivers ops posts: `slack` (default) or `console` (print to the server terminal). Use `console` for local/dev — see [features/slack-notifications.md](./features/slack-notifications.md)                                    |
| `SLACK_BOT_TOKEN`                       | Yes†     | Slack bot token for ops notifications. Required at boot when `SLACK_TRANSPORT=slack`                                                                                                                                                                   |
| `SLACK_SIGNING_SECRET`                  | Yes†     | Slack app signing secret for `POST /api/webhooks/slack` (Interactivity Request URL ack for admin URL buttons). Required at boot when `SLACK_TRANSPORT=slack`                                                                                           |
| `SLACK_CHANNEL_BOOKING_REQUESTS`        | Yes†     | Default booking-request channel ID                                                                                                                                                                                                                     |
| `SLACK_CHANNEL_CASH_COWS`               | Yes†     | Large-group (≥12) booking-request channel ID                                                                                                                                                                                                           |
| `SLACK_CHANNEL_SIGN_UPS`                | Yes†     | Customer / cook sign-up channel ID                                                                                                                                                                                                                     |
| `SLACK_CHANNEL_SUPPORT_REQUESTS`        | Yes†     | Support-request channel ID                                                                                                                                                                                                                             |
| `SLACK_CHANNEL_GIFT_CARD_PURCHASES`     | Yes†     | Gift-card purchase channel ID                                                                                                                                                                                                                          |
| `SLACK_CHANNEL_BOOKING_REQUEST_REPORTS` | Yes†     | Weekday booking digest channel ID                                                                                                                                                                                                                      |
| `SLACK_CHANNEL_OPS_ALERTS`              | Yes†     | Daily admin action-item report, Resend quota alerts, and other non-booking ops alerts channel ID                                                                                                                                                       |
| `SLACK_CHANNEL_WHATSAPP_MESSAGES`       | Yes†     | Inbound Concierge WhatsApp messages channel ID                                                                                                                                                                                                         |
| `WHATSAPP_TRANSPORT`                    | No       | How `serverRuntime.whatsapp` delivers WhatsApp: `meta` (default) or `console` (print to the server terminal). Use `console` for local/dev — see [architecture/whatsapp.md](./architecture/whatsapp.md)                                                 |
| `WHATSAPP_ACCESS_TOKEN`                 | Yes‡     | Meta Cloud API access token. Required at boot when `WHATSAPP_TRANSPORT=meta`                                                                                                                                                                           |
| `WHATSAPP_PHONE_NUMBER_ID`              | Yes‡     | Meta WhatsApp phone number id. Required at boot when `WHATSAPP_TRANSPORT=meta`                                                                                                                                                                         |
| `WHATSAPP_BUSINESS_ACCOUNT_ID`          | Yes‡     | Meta WhatsApp Business Account id. Required at boot when `WHATSAPP_TRANSPORT=meta`                                                                                                                                                                     |
| `WHATSAPP_APP_SECRET`                   | Yes‡     | Meta app secret for `X-Hub-Signature-256` webhook verification. Required at boot when `WHATSAPP_TRANSPORT=meta`                                                                                                                                        |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`         | Yes‡     | Token Meta sends on webhook subscription challenge. Required at boot when `WHATSAPP_TRANSPORT=meta`                                                                                                                                                    |
| `LANGFUSE_TRANSPORT`                    | No       | AI observability export: `off` (default) or `cloud`. See [architecture/observability.md](./architecture/observability.md)                                                                                                                              |
| `LANGFUSE_PUBLIC_KEY`                   | Yes§     | Langfuse project public key. Required at boot when `LANGFUSE_TRANSPORT=cloud`                                                                                                                                                                          |
| `LANGFUSE_SECRET_KEY`                   | Yes§     | Langfuse project secret key. Required at boot when `LANGFUSE_TRANSPORT=cloud`                                                                                                                                                                          |
| `LANGFUSE_BASE_URL`                     | No       | Langfuse API base URL (default `https://cloud.langfuse.com`)                                                                                                                                                                                           |
| `OTEL_TRANSPORT`                        | No       | General APM export: `off` (default), `otlp` (Grafana Cloud / OTLP), or `console`                                                                                                                                                                       |
| `OTEL_EXPORTER_OTLP_ENDPOINT`           | Yes¶     | OTLP HTTP endpoint. Required at boot when `OTEL_TRANSPORT=otlp`                                                                                                                                                                                        |
| `OTEL_EXPORTER_OTLP_HEADERS`            | No       | Optional OTLP auth headers (`Authorization=Basic …` or comma-separated `k=v` pairs)                                                                                                                                                                    |
| `OBSERVABILITY_ENVIRONMENT`             | No       | Trace/metric environment tag (default from `NODE_ENV`: `production` / `development` / `test`)                                                                                                                                                          |
| `sessionCookieSecure`                   | No       | Set to `"true"` in production to enable Secure + SameSite=None                                                                                                                                                                                         |
| `sessionCookieDomainScope`              | No       | Cookie domain scope for cross-subdomain sessions                                                                                                                                                                                                       |

\* Required at boot when `EMAIL_TRANSPORT=resend` (the default). Omitted when `EMAIL_TRANSPORT=console`. † Required at boot when
`SLACK_TRANSPORT=slack` (the default). Omitted when `SLACK_TRANSPORT=console`. ‡ Required at boot when `WHATSAPP_TRANSPORT=meta` (the
default). Omitted when `WHATSAPP_TRANSPORT=console`. § Required at boot when `LANGFUSE_TRANSPORT=cloud`. ¶ Required at boot when
`OTEL_TRANSPORT=otlp`.

Missing always-required names are logged as a multi-line `console.error` then the process throws — see
[architecture/environment.md](./architecture/environment.md).

### Database Migrations

Migrations are managed by Drizzle Kit. Run before or during deployment:

```bash
npm run db:migrate
```

Migration files live in the `drizzle/` directory and are committed to version control.

**Do not run `db:push` against prod or your dev DB.** `db:push` diffs your local `schema.ts` against the live DB and applies changes
directly, bypassing the `drizzle/` folder entirely — so the `drizzle.__drizzle_migrations` tracking table is never updated. The next
`db:migrate` will then try to re-run every unrecorded migration and fail on already-existing tables. `db:push` is only for the CI test
container (`drizzle-kit push` in `pipeline.yml`), which starts from an empty database each run.

If `db:push` has already been run by accident, the schema is up-to-date but the tracking table is out of sync. Recover with:

```bash
# Dry run — shows missing migration hashes and any phantom rows in the ledger
npm run db:reconcile

# Apply the fix — inserts the missing hashes (transactional; use --remove-phantoms if the dry run flagged any)
npm run db:reconcile -- --apply --remove-phantoms

# Verify
npm run db:check-applied
```

`scripts/migrationsReconcile.ts` reads `drizzle/meta/_journal.json`, hashes each migration's SQL the same way Drizzle does
(`sha256(file content)`), and inserts any hash that isn't already in `drizzle.__drizzle_migrations`, using the journal's `when` as
`created_at`. It never mutates schema — only the ledger. Run it once locally, then again with the prod `DATABASE_URL` for Coolify's DB.

**Wipe all app data (local/dev only).** Truncates every table in `public` and `pgboss` in one `TRUNCATE … CASCADE` (FK order handled by
Postgres) while leaving the `drizzle` schema — including `__drizzle_migrations` — untouched. Requires an explicit `--confirm`:

```bash
npm run db:wipe -- --confirm
```

## Continuous Integration & Deployment (GitHub Actions)

CI and CD live in a single workflow: `.github/workflows/pipeline.yml`. Gate jobs run in parallel on every pull request and push to `main` or
`production`; if all gates pass on a push, the `deploy` job builds and ships a Docker image to the matching Coolify environment (`main` →
test, `production` → production).

### Job graph

```
                      ┌─ changes (docs-only vs code) ──┐
                      │                                ├─ test (matrix 1/2, 2/2) ─► test-gate (check name: Test)
                      │                                ├─ e2e · run ───────────────► e2e-gate  (check name: End to end tests)
                      │                                └─ check (full or format+spell)
                      ├─ commitlint ───────────────────┐
                      ├─ codegen ──────────────────────┤
trigger ──────────────┼────────────────────────────────┼──── deploy (push to main → test /
                      └─ migrations-check ─────────────┘           push to production → production)
                          (matrix: prod, test)                   (Docker build + push + Coolify)
```

Typical gate wall-clock on a code PR is ~3–4 minutes (limited by Check or a Vitest shard); docs-only PRs skip Vitest shards and Playwright
and run a lighter Check. Deploy adds ~4 minutes on push.

All gate jobs that install dependencies share the composite action at `.github/actions/setup` which runs `actions/setup-node@v6`, pins the
npm version from `package.json#packageManager`, and runs `npm ci`. Update there if you change the dependency-install flow.

Runners are pinned to `ubuntu-24.04` (not `ubuntu-latest`) so the Oct–Nov 2026 migration of `ubuntu-latest` → Ubuntu 26.04 does not surprise
CI. Revisit with `ubuntu-26.04` when ready to validate on the new image.

### Gate jobs

**changes** — classifies the change set as docs-only or code. Docs-only means every changed path is under `docs/`, ends in `.md`, or is
`AGENTS.md` / `CLAUDE.md`. Empty diffs, missing bases (force push / `workflow_dispatch`), and any other path count as code. Outputs
`code=true|false` for Check / Test / E2e.

**commitlint** — validates commit messages against the conventional-commits config.

**codegen** — verifies generated files are up to date (no database required):

1. `npm ci`
2. `npm run graphql:generate` and `npm run db:generate`
3. `git diff --exit-code` on `*.gen.ts` / `*.generated.ts` / `drizzle/` — fails if codegen output differs from what was committed, or if new
   untracked files appear

**check** — static analysis (no database required). On **docs-only** change sets: format + spell in parallel only. On **code** change sets:
format, spell, types, and usage run **in parallel**; lint runs after they all succeed (types before lint, matching local `npm run check`).
Parallel logs are printed in collapsible groups so one failure does not hide another.

| Step (code PRs)   | Command                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format (parallel) | `prettier --check .`                                                                                                                                                                                                                                                                                                                              |
| Spell (parallel)  | `cspell .`                                                                                                                                                                                                                                                                                                                                        |
| Types (parallel)  | `tsc --noEmit`                                                                                                                                                                                                                                                                                                                                    |
| Usage (parallel)  | `knip`                                                                                                                                                                                                                                                                                                                                            |
| Lint (after)      | `eslint .` with an 8 GiB Node heap (`NODE_OPTIONS=--max-old-space-size=8192`). Type-aware rules (`projectService`) run on `src/server/**` and `src/shared/**` only; other paths use `disableTypeChecked`. Still includes CQRS `commands`↔`queries` import bans and Tailwind canonical classes via `better-tailwindcss/enforce-canonical-classes`. |

**test** — Vitest shards against a PostgreSQL 17 service container when `changes.code` is true (matrix `shard: [1, 2]`,
`npx vitest run --shard=N/2`):

1. `npm ci`
2. `drizzle-kit push` (applies schema to the test database)
3. shard run

Env for the job mirrors `.env.test.example`: always-required placeholders plus `EMAIL_TRANSPORT=console`, `SLACK_TRANSPORT=console`, and
`WHATSAPP_TRANSPORT=console`. Stripe/email/AI/Slack/WhatsApp calls are stubbed via `serverRuntime` in unit tests; the placeholders satisfy
boot validation when code paths touch the real `environmentVariables` proxy.

**test-gate** (check name `Test`) — always runs. Docs-only: exits 0. Code: fails unless every Vitest shard succeeded. This is the required
branch-protection check (shard jobs use distinct names `Test (1/2)` / `Test (2/2)` so the graph stays readable).

**e2e** (`End to end tests · run`) — Playwright UI suite against the same Postgres service pattern as `test` when `changes.code` is true:
restore Chromium from an Actions cache keyed on `package-lock.json` (`~/.cache/ms-playwright`), run
`npx playwright install --with-deps chromium` (no-op / fast on cache hit for the browser tarball; OS deps still install), apply schema
(`db:push`), then `npm run test:e2e` (Playwright starts the app via `webServer`). CI uses **2 Playwright workers** with `fullyParallel`
(specs isolate via nanoIds; no truncate) — see [e2e.md](./architecture/e2e.md). Env mirrors `.env.test.example` (console
email/Slack/WhatsApp transports) so `serverRuntimeCreate` can boot. Dual-accept e2e that needs live Stripe still uses real test keys when
provided.

**e2e-gate** (check name `End to end tests`) — always runs. Docs-only: exits 0. Code: fails unless the Playwright job succeeded. Required
branch-protection check.

**migrations-check** — verifies that prod and test databases have applied every migration in the `drizzle/` folder. Runs as a matrix
(`prod`, `test`) and fails the PR if any migration is missing — forces you to deploy migrations before merging schema-dependent code. The
script (`scripts/migrationsCheck.ts`) hashes each local migration's SQL with the same algorithm Drizzle uses internally
(`sha256(file content)`) and compares against rows in `drizzle.__drizzle_migrations`.

PRs from forks have no access to the DB secrets and so the job is skipped on them; require a maintainer push or branch to run the check.

### Deploy job

Runs only on `push` to `main` or `production`, and only after every gate passes (`test-gate` and `e2e-gate` always report success or
failure; docs-only pushes do not need Vitest or Playwright to have run). The job matrix is built with `fromJSON` so a push creates **one**
deploy leg: `main` → test secrets, `production` → production secrets. (Do not filter with `matrix.exclude` while also listing both envs
under `include` — GitHub applies `include` after `exclude` and re-adds the dropped combination.)

Uses a separate concurrency group (`deploy-${{ matrix.environment }}`, `cancel-in-progress: false`) so concurrent deploys to the same
environment queue rather than abort.

1. Builds a Docker image and pushes it to **GitHub Container Registry** (GHCR) with Docker layer caching
2. Tags the image with the commit SHA and `latest`
3. PATCHes the matching Coolify application to point to the new image tag
4. Restarts that application via the Coolify API
5. Polls `${WEB_APP_URL_TEST|PROD}/api/health` until the response's `version` field equals the deployed commit SHA — fails the workflow on
   timeout (~5 minutes) so a Coolify restart that silently rolled back to the old image surfaces as a red deploy job

### Required secrets

| Secret                               | Description                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `COOLIFY_URL`                        | Coolify instance URL (e.g. `https://coolify.example.com`)                                                                   |
| `COOLIFY_API_TOKEN`                  | Coolify API token (instance/team-scoped; used for both test and production deploys)                                         |
| `COOLIFY_APPLICATION_UUID_TEST`      | Test application UUID                                                                                                       |
| `COOLIFY_APPLICATION_UUID_PROD`      | Production application UUID                                                                                                 |
| `COOLIFY_APPLICATION_UUID_STORYBOOK` | Storybook Coolify application UUID (see [Storybook](#storybook--email-preview-coolify))                                     |
| `COOLIFY_APPLICATION_UUID_EMAIL`     | React Email preview Coolify application UUID (see [Storybook](#storybook--email-preview-coolify))                           |
| `WEB_APP_URL_TEST`                   | Public URL of the test app — polled by the post-deploy verification step                                                    |
| `WEB_APP_URL_PROD`                   | Public URL of the production app — polled by the post-deploy verification step                                              |
| `DATABASE_URL_TEST`                  | Connection string used by `migrations-check (test)` — recommend a role with `SELECT` on `drizzle.__drizzle_migrations` only |
| `DATABASE_URL_PROD`                  | Connection string used by `migrations-check (prod)` — recommend a role with `SELECT` on `drizzle.__drizzle_migrations` only |

> Note: the GitHub Actions secret `WEB_APP_URL` and the runtime env var `WEB_PAGE_URL` are different things. `WEB_APP_URL` is only read by
> the post-deploy health-check polling step in `pipeline.yml`; the running app reads `WEB_PAGE_URL` for canonical URLs and SEO. Set both to
> the matching public origin per environment (`WEB_APP_URL_TEST` / `WEB_APP_URL_PROD` alongside each app's `WEB_PAGE_URL`).

## Coolify Deployment Strategy

peopleeat runs **two Coolify applications**: test tracks `main`, production tracks the `production` branch. Promoting is an explicit `main`
→ `production` merge (manual gate before production).

| Environment | Coolify Resource    | Branch       | Trigger                              |
| ----------- | ------------------- | ------------ | ------------------------------------ |
| Test        | Application         | `main`       | Push to `main` (CD)                  |
| Production  | Application         | `production` | Merge `main` → `production` (manual) |
| Preview     | Preview Deployments | PR branches  | Pull request open/update (on test)   |

**Setup in Coolify:**

1. Create **two** Applications (Docker → GHCR) — test and production — each with its own domain, env vars, and PostgreSQL database
2. Point both at `ghcr.io/<owner>/<repo>` (CD updates the image tag on every deploy)
3. **Authenticate the Coolify host to GHCR** — packages under `ghcr.io` are private by default. The Coolify app UI only has **Docker Image**
   / **Tag** fields (no username/password). The GitHub App under Sources authenticates **git**, not `docker pull`. Without a host-level
   registry login, rolling update fails at `docker compose pull` with `error from registry: unauthorized` even when Actions pushed
   successfully.
   - GitHub → Settings → Developer settings → Personal access tokens → classic PAT with `read:packages` (authorize SSO for the `people-eat`
     org if required)
   - SSH into the Coolify **deployment server** as the same user Coolify uses for Docker (usually **root**), then:

     ```bash
     printf '%s' 'YOUR_PAT' | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
     ```

     Credentials land in that user's `~/.docker/config.json`. Coolify must see them as root — if you logged in as a normal user, re-run as
     `root` (or copy the config into `/root/.docker/config.json`).

   - Alternatively make the GHCR package public (Package settings → Change visibility) if anonymous pulls are acceptable
4. Create a protected `production` branch on GitHub (require PRs, restrict who can merge)
5. Configure the dual-env secrets listed in [Required secrets](#required-secrets)
6. Optionally enable Preview Deployments on the **test** application

The `deploy` job in `.github/workflows/pipeline.yml` builds a branch-scoped matrix via `fromJSON`: `main` → test secrets only, `production`
→ production secrets only.

### Per-PR Preview Deployments

Preview deployments spin up an ephemeral instance for each pull request and tear it down when the PR is merged or closed. Coolify v4 manages
the lifecycle natively against the test Application — no additional CD workflow is required.

**Setup in Coolify:**

1. Open the **test** Application → **Preview Deployments** tab
2. Enable preview deployments
3. Set the **Base Domain** (e.g. `preview.example.com`) — each PR gets `pr-<number>.preview.example.com`
4. Configure environment overrides for previews (typically a shared preview database)

For most teams, a **shared preview database** with schema push on deploy is sufficient:

```bash
npx drizzle-kit push
```

### Database Migrations in Deployment

Run migrations as part of the deploy process:

```bash
# Option A: Run before restarting (CI/CD step after image push)
DATABASE_URL=<env-url> npx drizzle-kit migrate

# Option B: Run on container start (entrypoint script)
#!/bin/sh
npx drizzle-kit migrate && node --import ./ops/observability/register.mjs .output/server/index.mjs
```

Option A is safer — if the migration fails, the old container keeps running.

## Storybook + Email preview (Coolify)

There is **one Storybook** and **one React Email preview**, both built from `main` and deployed as separate Coolify applications. Component
/ email surfaces live on `main`, so a production-branch copy would not show anything different — keep each single regardless of how many
runtime environments you add.

| Surface       | URL                                | Image                                  | Dockerfile             | Workflow                              |
| ------------- | ---------------------------------- | -------------------------------------- | ---------------------- | ------------------------------------- |
| Storybook     | `https://storybook.people-eat.com` | `ghcr.io/<owner>/<repo>/storybook`     | `Dockerfile.storybook` | `.github/workflows/storybook.yml`     |
| Email preview | `https://email.people-eat.com`     | `ghcr.io/<owner>/<repo>/email-preview` | `Dockerfile.email`     | `.github/workflows/email-preview.yml` |

Both are protected with **Coolify Basic Auth** (Traefik middleware in the Coolify UI — not application code).

### How it works

Each workflow runs on pushes to `main` that touch its surface (GitHub `paths` filter), or on manual `workflow_dispatch`. They run in
parallel with CI — a CI failure on the same commit shows as a separate red check and does not block these deploys.

| Workflow      | Redeploys when these change                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storybook     | `src/web/components/**`, `src/web/storybook/**`, `.storybook/**`, `Dockerfile.storybook`, `Dockerfile.storybook.dockerignore`, `docker/storybook/**` |
| Email preview | `src/server/email/**`, `Dockerfile.email`, `Dockerfile.email.dockerignore`                                                                           |

Deploy steps (same Coolify pattern as the main app, without `/api/health` SHA polling):

1. Build and push the image to GHCR (`:sha-…` + `:latest`)
2. PATCH the Coolify application to the new image tag
3. Restart the Coolify application

**Storybook** is a static `storybook-static/` build served by nginx (listens on Coolify’s `PORT`). **Email preview** runs `email build` then
`email start` (React Email’s Next preview app). The email image bakes `EMAIL_PREVIEW_WEB_PAGE_URL=https://demo.people-eat.com` so logo /
Instagram assets resolve against the test site. Local `npm run email:dev` still defaults to `http://localhost:3000`.

### Coolify + DNS setup

1. DNS: `storybook.people-eat.com` and `email.people-eat.com` → the Coolify / Traefik host
2. Create **two** Coolify Applications (Docker Image from GHCR) — Storybook and Email preview — pointing at the image names above
3. Authenticate the Coolify host to GHCR if not already (same `docker login ghcr.io` as the main app)
4. Attach each domain; enable **Basic Auth** on both applications
5. Set GitHub secrets `COOLIFY_APPLICATION_UUID_STORYBOOK` and `COOLIFY_APPLICATION_UUID_EMAIL` (reuse `COOLIFY_URL` + `COOLIFY_API_TOKEN`)
6. Disable GitHub Pages for this repo if it was still serving the old Storybook
