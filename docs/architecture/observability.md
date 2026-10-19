# Observability

## Context

peopleeat already persists product ledgers for debugging: Postgres `Logs` ([logging.md](./logging.md)), one-shot `AiGenerations`
([ai-generations.md](./ai-generations.md)), and chat-turn token columns. Those answer “what happened in our domain tables?” They do not
answer “why was this GraphQL request slow?”, “which SQL dominated?”, or “how did the cook assistant nest tools and tokens on this turn?”

OpenTelemetry (OTel) is the instrumentation standard. Langfuse is the AI specialty UI on top of OTel traces. A Grafana stack (Tempo /
Prometheus, Cloud or self-hosted on Coolify) is the general APM surface for HTTP, GraphQL, jobs, and Postgres spans.

## Decision

**Instrument once with OpenTelemetry; export with soft transports; keep Postgres ledgers.**

| Signal                                   | Destination                                                 | Role                                                      |
| ---------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| App errors / events                      | Postgres `Logs` (unchanged)                                 | Durable, admin-queryable product log                      |
| One-shot AI prompts                      | `AiGenerations` (unchanged)                                 | Admin audit ledger                                        |
| LLM / agent traces                       | Langfuse (`LANGFUSE_TRANSPORT=cloud` + `LANGFUSE_BASE_URL`) | Generations, tools, cost, sessions (Cloud or self-hosted) |
| Request / SQL / job traces + RED metrics | Grafana via OTLP (`OTEL_TRANSPORT=otlp`)                    | Latency waterfalls, p95, error rate (Cloud or Coolify)    |
| Aggregate slow SQL                       | `pg_stat_statements` (+ admin UI / GraphQL)                 | “Which queries take longest?” globally                    |
| Ops thresholds                           | Slack `opsAlerts` recurring job                             | Error-rate and slow-SQL alerts without opening Grafana    |

Transports default to **off** so local/test boot never requires vendor keys (same pattern as email/Slack/WhatsApp console transports).

### Trace vocabulary

- **Trace** — one unit of work (one GraphQL operation, one chat turn, one job run)
- **Span** — a timed step (SQL, LLM generation, tool execute)
- **Session** (Langfuse) — many related traces; for assistant chats we set `sessionId` to `chatId`
- **Generation** — LLM call observation (tokens, model, cost)

### Slow queries (two complementary answers)

1. **Aggregate** — `pg_stat_statements` ranked by `total_exec_time` / `mean_exec_time` (admin `/admin/database-slow-statements`, GraphQL
   `databaseSlowStatements`, runbook SQL below)
2. **Per-request** — OTel `pg` spans nested under the GraphQL / job span in Grafana

## Alternatives considered

| Option                             | Why rejected                                                            |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Langfuse only                      | Strong for AI; weak for GraphQL/SQL/job latency                         |
| Grafana / Datadog only             | Weak LLM tree, cost, and eval surface                                   |
| Replace Postgres `Logs` with Loki  | Loses admin GraphQL product log; more ops for little gain at this stage |
| Always-required Langfuse/OTLP keys | Breaks local/test; contradicts transport pattern                        |

## Consequences

- Enable Langfuse and/or OTLP in Coolify when ready; leave transports `off` in `.env.local` / `.env.test`.
- Prompts and tool I/O may contain PII — use separate Langfuse projects (or environments) for production vs staging; never point local
  development at the production Langfuse project with real user data unless intentional.
- `pg_stat_statements` must be available on the Postgres instance (`shared_preload_libraries`); the admin query returns `[]` when the
  extension is missing.
- Trace ids are merged into `Logs.context` when an active span exists so admin log rows can be correlated with Grafana/Langfuse.

## How it works

### Environment

| Variable                      | Required         | Notes                                                                           |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `LANGFUSE_TRANSPORT`          | No               | `off` (default) \| `cloud` (means “send to Langfuse API”, Cloud or self-hosted) |
| `LANGFUSE_PUBLIC_KEY`         | Yes when `cloud` | Project public key                                                              |
| `LANGFUSE_SECRET_KEY`         | Yes when `cloud` | Project secret key                                                              |
| `LANGFUSE_BASE_URL`           | No               | Default `https://cloud.langfuse.com`; set to your Coolify Langfuse origin       |
| `OTEL_TRANSPORT`              | No               | `off` (default) \| `otlp` \| `console`                                          |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Yes when `otlp`  | OTLP HTTP base (Grafana Cloud or Coolify Alloy / otel-lgtm)                     |
| `OTEL_EXPORTER_OTLP_HEADERS`  | No               | Comma-separated `k=v` pairs for auth                                            |
| `OBSERVABILITY_ENVIRONMENT`   | No               | Defaults from `NODE_ENV` (`production` / `development` / `test`)                |

See [infrastructure.md](../infrastructure.md). Self-host on Coolify: [Self-hosting on Coolify](#self-hosting-on-coolify).

### Boot

Two steps, in order:

1. **Preload instrumentations** — Node `--import ./ops/observability/register.mjs` runs
   [`ops/observability/register.mjs`](../../ops/observability/register.mjs) **before** any application module. It calls
   `registerInstrumentations` for `PgInstrumentation` + `HttpInstrumentation` when `OTEL_TRANSPORT` or `LANGFUSE_TRANSPORT` is not `off`.
   This is required so `pg` is patched before the app imports it.
2. **Start exporters** — [`observabilityStart()`](../../src/server/observability/observabilityStart.ts) runs once from
   [`server.ts`](../../src/server/graphql/server.ts) (after static imports). It builds OTel `NodeSDK` span processors (Langfuse and/or OTLP
   and/or console), registers AI SDK 7 `LangfuseVercelAiSdkIntegration` when Langfuse or OTLP is on, and starts a metrics `MeterProvider`
   when `OTEL_TRANSPORT=otlp`. It does **not** re-register Pg/HTTP instrumentations if the preload already did (see
   `otelInstrumentationsRegistered.ts`).

Wiring:

| Environment | How `--import` is applied                                                                   |
| ----------- | ------------------------------------------------------------------------------------------- |
| Production  | Dockerfile `CMD`: `node --import ./ops/observability/register.mjs .output/server/index.mjs` |
| Local dev   | `npm run dev` → `node --import ./ops/observability/register.mjs …/vite.js dev`              |

Calling `observabilityStart()` alone (no preload) is too late: `serverRuntimeCreate` → `db` → `pg` already loaded via static imports.

### External `pg` + preload (required for SQL child spans)

`@opentelemetry/instrumentation-pg` patches the real `node_modules/pg` / `pg-pool` modules. Three pieces must all be true:

1. [`vite.config.ts`](../../vite.config.ts) — `optimizeDeps.exclude` and `nitro.rollupConfig.external` include `pg` and `pg-pool` (Nitro
   would otherwise inline them into the drizzle chunk)
2. [`Dockerfile`](../../Dockerfile) runtime — installs lockfile-pinned `pg` next to `playwright`, plus `@opentelemetry/api` /
   `@opentelemetry/instrumentation` / `instrumentation-http` / `instrumentation-pg` for the preload
3. Node `--import` preload above — registers instrumentations before the app loads

Without all three, Tempo GraphQL traces show only the root `graphql {operation}` span with no `pg.query:*` children.

### AI instrumentation

- Chat turns: `propagateAttributes` + agent `telemetry.functionId` in
  [`chatTurnAgentCreate.ts`](../../src/server/lib/chatTurnAgentCreate.ts)
- One-shots / agents: shared helpers in [`aiTelemetry.ts`](../../src/server/observability/aiTelemetry.ts)

### Client connection aborts

Mobile clients, browser refreshes, and Traefik idle closes routinely tear down the TCP socket while a request is still open. Node's HTTP
server then destroys the `IncomingMessage` with `Error: aborted` / `code: 'ECONNRESET'` (`abortIncoming`). That is expected peer behavior,
not an application failure — it must not appear as `[uncaughtException]` (or bare `console.error`) noise in Coolify logs.

Handling lives in a Nitro runtime plugin registered from `vite.config.ts`:

1. Patch `http.Server` / `https.Server` `emit('request')` so every req/res gets an `'error'` listener that swallows client-abort shapes
   (`isClientConnectionAbortError`) and still logs anything else
2. Filter residual `console.error` calls whose arguments match the same predicate (Nitro's `trapUnhandledErrors` always logs before
   `captureError`, so a hook alone cannot silence it)

Key files: [`clientConnectionAbortPlugin.ts`](../../src/server/nitro/clientConnectionAbortPlugin.ts),
[`isClientConnectionAbortError.ts`](../../src/server/utils/isClientConnectionAbortError.ts).

### Request / job / ingress instrumentation

- **GraphQL queries/mutations**: [`graphqlHttpQueryRun`](../../src/server/graphql/server.ts) (from
  [`/api/graphql`](../../src/routes/api/graphql.ts)) opens one Tempo span + RED (`graphql.operation.duration` / `.errors`) that covers
  **session upsert and** Apollo `executeOperation`, so session SQL and resolver SQL both nest as `pg.query:*` children. Attributes:
  `graphql.operation.name` (client `operationName` when present, else document name), `graphql.operation.type`, `session.id` / `enduser.id`
  after session load, and on failure `graphql.error.class` (`unauthorized` / `not_found` / `graphql_error`) + `graphql.error.count`. Helpers
  live in [`graphqlOperationMeta.ts`](../../src/server/observability/graphqlOperationMeta.ts).
- **GraphQL subscriptions**: setup span + RED on `executeGraphQLSubscription` (same operation metrics, type `subscription`). SSE connection
  lifetime is a separate metric family (`graphql.subscription.duration` / `.events` / `.errors`) recorded when the stream ends — not a
  long-lived Tempo span.
- **Jobs**: span + RED around each `boss.work` handler
- **HTTP ingress**: [`withIngressSpan`](../../src/server/observability/withIngressSpan.ts) wraps Stripe / WhatsApp POST / Resend / Slack
  webhooks and `POST /api/file-uploads`. Span attrs include `ingress.provider`, `http.route`, optional `ingress.event_type` (Stripe/Resend).
  RED: `http.ingress.duration` / `.errors` (errors = status ≥ 500 only; 4xx is not alert noise). File download GET is not wrapped (high
  volume; HttpInstrumentation is enough).
- **Logger**: active `traceId` / `spanId` merged into persisted log context
- **Browser RUM**: public mutation `clientObservabilityReport` (not consent-gated; same stance as SessionEvents). Collectors in
  [`src/web/observability/`](../../src/web/observability/) report Web Vitals (`web-vitals`), URQL operation failures, and `RouteError`
  mounts. Server records OTel metrics (`client.web_vital.duration` / `.score`, `client.graphql.errors`, `client.route.errors`) via
  [`clientMetrics.ts`](../../src/server/observability/clientMetrics.ts). GraphQL / route errors also write `Logs` rows (message prefix
  `client graphql:` / `client route:`). Web Vitals are metrics-only (not persisted to Logs or SessionEvents).

Grafana Explore: Tempo filter `ingress.provider` or span name `ingress stripe`; Prometheus `http.ingress.duration`,
`graphql.operation.duration`, `graphql.subscription.duration`, `client.web_vital.duration`, `client.graphql.errors`.

### Runbook: where did this GraphQL request’s time go?

1. Grafana → Explore → Tempo (or GraphQL dashboard → drill into a slow series).
2. TraceQL: `{ span.graphql.operation.name = "ChefsPage" }` (or the operation you care about). Prefer
   `resource.deployment.environment = "production"` when the variable is not already scoped.
3. Open a slow trace. Under `graphql ChefsPage` you should see many `pg.query:SELECT …` (and similar) children. Their durations explain the
   parent; look for one heavy statement vs a fan-out of tiny queries (e.g. per-row `file_uploads` loads).
4. For **aggregate** “which SQL is expensive globally?”, use `pg_stat_statements` (admin `/admin/database-slow-statements` or the SQL below)
   — that is not per-request attribution.

If a GraphQL span has **no** `pg.query:*` children in production, check the three requirements in
[External `pg` + preload](#external-pg--preload-required-for-sql-child-spans) (external `pg`, runtime packages, and `--import` preload).

### Slack ops alert

Recurring job `observability-ops-alert` samples GraphQL / job / ingress RED windows, recent Postgres error-log volume, and top
`pg_stat_statements` means, posting to `slackChannelOpsAlerts` when thresholds are crossed (silent when healthy or Slack is `console`).
Ingress alerts when ≥5 samples in the window and error rate ≥ 5%.

### Runbook: enable `pg_stat_statements`

On the Postgres host (requires ability to set preload libraries — Coolify/managed PG UI or superuser):

```sql
-- After shared_preload_libraries includes 'pg_stat_statements' and Postgres restarts:
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  calls,
  left(query, 200) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

Admin UI: `/admin/database-slow-statements`. GraphQL: `Admin.databaseSlowStatements(limit: Int! = 20)`.

## Self-hosting on Coolify

Run **two** Coolify resources next to peopleeat (do not put them inside the peopleeat app container):

1. **Langfuse** — AI traces (official Docker Compose)
2. **Grafana OTel LGTM** — OTLP sink for GraphQL / SQL / job traces + metrics (single image to start)

Keep them on a dedicated Coolify project (e.g. `observability`) so restarts do not couple to app deploys. Prefer a VM with **≥4 vCPU / 16
GiB RAM** and **≥100 GiB** disk; observability volume grows quickly.

Official Langfuse compose guide:
[langfuse.com/self-hosting/deployment/docker-compose](https://langfuse.com/self-hosting/deployment/docker-compose). Grafana all-in-one OTLP
image: [`grafana/otel-lgtm`](https://github.com/grafana/docker-otel-lgtm).

### A. Langfuse (Docker Compose resource)

1. Coolify → **New Resource** → **Docker Compose** (empty / raw compose).
2. Paste the upstream compose from https://github.com/langfuse/langfuse/blob/main/docker-compose.yml (pin a release tag in production).
3. Replace every `# CHANGEME` secret before first start:
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `SALT` — long random string
   - `ENCRYPTION_KEY` — `openssl rand -hex 32` (64 hex chars)
   - Postgres / Redis / ClickHouse / MinIO passwords
4. Set public URL env on **both** web and worker:
   - `NEXTAUTH_URL=https://langfuse.<your-domain>` (exact browser URL, HTTPS)
5. Coolify **Domains**: map `langfuse.<your-domain>` → service `langfuse-web` port `3000`. Do **not** publicly expose Postgres, Redis,
   ClickHouse, or worker.
6. Enable **persistent volumes** for postgres, clickhouse, redis, minio (Coolify volume UI / compose `volumes:`).
7. Deploy; wait until `langfuse-web` logs `Ready` (~2–3 minutes).
8. Open the UI → **Sign up** (no default admin) → create org + project → **Settings → API Keys** → copy public/secret keys.
9. Optional later: point Langfuse S3 event/media buckets at your existing Garage instead of MinIO
   ([blob storage docs](https://langfuse.com/self-hosting/deployment/infrastructure/blobstorage)). Keep MinIO for v1 unless you need one
   less container.

### B. Grafana OTel LGTM (single Docker image)

Simplest Coolify path that accepts OTLP HTTP and shows Tempo traces + Prometheus metrics + Grafana UI:

1. Coolify → **New Resource** → **Docker Image** → `grafana/otel-lgtm:latest` (pin a digest/tag in production).
2. Publish container port **3000** (Grafana UI) and **4318** (OTLP HTTP). Coolify Traefik can map two domains or one domain + path; easiest
   is two hostnames:
   - `grafana.<your-domain>` → `3000`
   - `otel.<your-domain>` → `4318`
3. Add a persistent volume for `/data` (or the image’s documented data path) so traces survive restarts.
4. Open Grafana (`admin` / check image docs for default password; change immediately).
5. Confirm Tempo + Prometheus datasources exist (pre-wired in `otel-lgtm`).

When you outgrow the all-in-one image, replace it with Alloy + Tempo + Mimir + Grafana as separate Coolify services; peopleeat’s
`OTEL_EXPORTER_OTLP_ENDPOINT` stays the same shape.

### C. Point peopleeat at the stack

On the **peopleeat** Coolify application env (test first, then production):

```bash
LANGFUSE_TRANSPORT=cloud
LANGFUSE_PUBLIC_KEY=pk-lf-…
LANGFUSE_SECRET_KEY=sk-lf-…
LANGFUSE_BASE_URL=https://langfuse.<your-domain>

OTEL_TRANSPORT=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.<your-domain>
# OTEL_EXPORTER_OTLP_HEADERS=   # only if you put basic-auth / token in front of OTLP
OBSERVABILITY_ENVIRONMENT=production
```

`LANGFUSE_TRANSPORT=cloud` means “export to a Langfuse API”; `LANGFUSE_BASE_URL` selects Cloud vs your Coolify instance.

Redeploy peopleeat. Trigger a chat turn and a GraphQL mutation, then:

- Langfuse → Traces / Sessions (session id = chat id)
- Grafana → Explore → Tempo (GraphQL / ingress / `pg` spans) and Prometheus (`graphql.operation.duration`, `graphql.subscription.duration`,
  `http.ingress.duration`, `job.handler.duration`)
- Grafana → folder **peopleeat** (versioned dashboards below)

### D. Grafana APM dashboards

Live on `https://grafana.people-eat.com` in folder UID `peopleeat` (tag `peopleeat`). The `environment` dashboard variable defaults to
**production** (`deployment_environment`); switch to `test` or All when needed. Metrics and the Overview Tempo panel both honor it
(`resource.deployment.environment` on traces). Datasource UIDs: `prometheus`, `tempo`.

| Dashboard      | UID                      | URL                                                                                  |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| Overview       | `peopleeat-overview`     | [/d/peopleeat-overview](https://grafana.people-eat.com/d/peopleeat-overview)         |
| GraphQL        | `peopleeat-graphql`      | [/d/peopleeat-graphql](https://grafana.people-eat.com/d/peopleeat-graphql)           |
| Jobs & Ingress | `peopleeat-jobs-ingress` | [/d/peopleeat-jobs-ingress](https://grafana.people-eat.com/d/peopleeat-jobs-ingress) |
| Client         | `peopleeat-client`       | [/d/peopleeat-client](https://grafana.people-eat.com/d/peopleeat-client)             |

JSON sources of truth: [`ops/grafana/dashboards/`](../../ops/grafana/dashboards/). Regenerate with
`node ops/grafana/dashboards/generate.mjs`, then push via Grafana UI import or API (`POST /api/dashboards/db` with `folderUid: peopleeat`,
`overwrite: true`). Prometheus metric names use OTel → Prometheus conventions (e.g. `graphql_operation_duration_milliseconds_bucket`, label
`graphql_operation_name`). Panels for metrics not yet exported (ingress, some error counters, client GraphQL/route errors) stay empty until
those series appear.

Cursor: Grafana MCP (`mcp-grafana`) against this instance can create/update the same dashboards; keep the service-account token in
`~/.cursor/mcp.json` only (never commit it).

### E. App Postgres `pg_stat_statements`

On the **peopleeat** Postgres (not Langfuse’s Postgres), enable the extension (Coolify DB → config / `shared_preload_libraries`, then
restart):

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

Then open `/admin/database-slow-statements`, use GraphQL `databaseSlowStatements`, or the SQL in the runbook above.

### F. Network and security checklist

- Langfuse and OTLP only on HTTPS via Coolify Traefik; restrict who can open Grafana (SSO / IP allowlist / basic auth).
- Prefer private Docker network so peopleeat → `http://otel:4318` works **without** public OTLP if both apps share a Coolify destination;
  otherwise keep public `https://otel.…` and protect it.
- Separate Langfuse projects (or instances) for test vs production; prompts contain PII.
- Disk alerts on ClickHouse / MinIO / LGTM volumes.
- Do not reuse peopleeat’s app `DATABASE_URL` for Langfuse — Langfuse needs its own Postgres (+ ClickHouse + Redis + blob).

## Key files

- `ops/observability/register.mjs` — Node `--import` preload (Pg/HTTP instrumentations before app load)
- `src/server/observability/observabilityStart.ts` — OTel + Langfuse exporters / meters (idempotent instrumentations)
- `src/server/observability/otelInstrumentationsRegistered.ts` — preload ↔ app handoff flag
- `src/server/graphql/server.ts` — `graphqlHttpQueryRun` / subscription spans
- `src/routes/api/graphql.ts` — HTTP entry; session upsert inside the GraphQL span
- `src/server/observability/aiTelemetry.ts` — AI SDK telemetry helpers
- `src/server/observability/graphqlOperationMeta.ts` — operation name / type / error class
- `src/server/observability/redMetrics.ts` — GraphQL / subscription / job / ingress RED meters
- `src/server/observability/clientMetrics.ts` — browser RUM meters
- `src/server/observability/withIngressSpan.ts` — webhook + file-upload span wrapper
- `src/server/observability/traceContext.ts` — active span ids for logs
- `src/server/commands/clientObservabilityReport.ts` — browser RUM ingest mutation
- `src/web/observability/` — Web Vitals bootstrap + report helpers
- `src/server/queries/adminDatabaseSlowStatementsFindMany.ts` — `pg_stat_statements` admin read
- `src/server/jobs/handlers/observabilityOpsAlert.ts` — Slack threshold alerts
- `ops/grafana/dashboards/` — Grafana dashboard JSON + `generate.mjs`
- `vite.config.ts` / `Dockerfile` — external + runtime `pg` (SQL child spans)
