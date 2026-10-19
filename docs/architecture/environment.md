# Environment Variables

## Context

Environment variables are read in many places (database connection, session cookie config, etc.). Without a central pattern, missing
variables fail at unpredictable points: a route might handle requests for minutes before a missing var crashes a deep code path, and tests
can drift out of sync with what production actually requires. Silent no-ops (e.g. Slack/Klaviyo when unset) hide production misconfiguration
until someone notices missing ops traffic.

## Decision

A single module — `src/server/env/environmentVariablesCreate.ts` — declares every required variable, validates them at startup, and exposes
a typed `EnvironmentVariables` object. No code outside this module reads `process.env` directly. Functions that need configuration receive
it as a parameter (or read it from a shared `environmentVariables` instance).

### Typed fields

The typed shape lives in [`src/server/env/EnvironmentVariables.ts`](../../src/server/env/EnvironmentVariables.ts) — that file is the source
of truth for every field. Do not mirror the interface in this doc; it drifts.

### Validation

Validation lives in [`src/server/env/environmentVariablesCreate.ts`](../../src/server/env/environmentVariablesCreate.ts).

Almost every integration credential is **always required at boot** (Stripe, LiveKit, object storage, Klaviyo, Google AI/Places, auth
peppers, reCAPTCHA, `SERVER_TOKEN_SECRET`, …). Two transports are the only escape hatches for local/dev:

| Transport            | Values                         | Effect                                                                                                                                                                                                                                             |
| -------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EMAIL_TRANSPORT`    | `resend` (default) / `console` | When `resend`, also require `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`. When `console`, those three are omitted and `serverRuntime.email.send` prints plaintext to the terminal.                                               |
| `SLACK_TRANSPORT`    | `slack` (default) / `console`  | When `slack`, also require `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, + every `SLACK_CHANNEL_*`. When `console`, those are omitted and `serverRuntime.slack.postMessage` prints to the terminal.                                                   |
| `WHATSAPP_TRANSPORT` | `meta` (default) / `console`   | When `meta`, also require `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. When `console`, those are omitted and WhatsApp sends print to the terminal. |

True defaults (not credentials) stay optional: `sessionCookieSecure`, `sessionCookieDomainScope`, `BUILD_SHA`, `LIVEKIT_ROOM_PREFIX`,
`OBJECT_STORAGE_S3_FORCE_PATH_STYLE`, `CHAT_DEBUG_ENABLED`, `OBSERVABILITY_ENVIRONMENT`, `LANGFUSE_BASE_URL`, `OTEL_EXPORTER_OTLP_HEADERS`.

Observability vendors follow the same transport pattern as email/Slack/WhatsApp: `LANGFUSE_TRANSPORT=off|cloud` (default `off`) and
`OTEL_TRANSPORT=off|otlp|console` (default `off`). Provider keys are required only when the matching transport is on — see
[observability.md](./observability.md).

`environmentVariablesCreate()` collects every missing variable, `console.error`s a multi-line list (one name per line), then throws once
with the same names joined — the operator sees the full picture in Coolify/Docker logs even when Vite wraps the throw. The
`export const environmentVariables` at the bottom of the file is a `Proxy` that lazily calls `environmentVariablesCreate()` on first
property access — validation runs the first time real code reads a field (in practice, at server boot), but merely importing the module does
not trigger it. This keeps unit tests that import the factory free of any `process.env` dependency.

### Consumption

- **Production code**: imports `environmentVariables` from `src/server/env/environmentVariablesCreate.ts` and reads typed fields (e.g.
  `environmentVariables.databaseUrl`, `environmentVariables.sessionCookie.name`).
- **Tests**: unit tests that import `environmentVariablesCreate` pass an explicit source object via `environmentVariablesTestSource()`
  (`src/server/env/environmentVariablesTestSource.ts`) and never read `process.env`. That helper sets `EMAIL_TRANSPORT=console` and
  `SLACK_TRANSPORT=console` and `WHATSAPP_TRANSPORT=console` so provider credentials are not required. Integration tests that touch the
  database read values from the shell environment / `.env.test`.
- **Pure helpers** (e.g. `sessionUtils`): take the relevant slice of `EnvironmentVariables` as a parameter so they remain trivially testable
  without touching `process.env`.

### Adding a New Variable

1. Decide: always boot-required, or gated by an existing/new transport (`console` skips provider credentials). Prefer always-required.
2. Add the key to the always-required list (or the transport-conditional list) in `environmentVariablesCreate.ts`.
3. Add the typed field to `EnvironmentVariables` in `src/server/env/EnvironmentVariables.ts`.
4. Map `process.env.X` to the typed field inside `environmentVariablesCreate()`.
5. Document the variable in `docs/infrastructure.md`.
6. Add it to `.env.local.example` / `.env.test.example` and to `environmentVariablesTestSource` when always-required.

### Transports vs always-required

Do **not** reintroduce “capability-optional / no-op when unset” for Stripe, LiveKit, object storage, Klaviyo, Places, auth, or reCAPTCHA. If
a capability must be skippable in local/dev, add an explicit transport (`console` or similar) like email and Slack — never silent absence of
a secret.

Unit tests that exercise commands still inject stubs via `ServerRuntime` (see `src/server/test/aiTestUtils.ts` / `commandTestUtils.ts`) and
never reach `serverRuntimeCreate`, so they do not need real provider HTTP even though boot-required keys appear in the typed env.

## Alternatives Considered

- **Direct `process.env.X!` reads scattered through the code**: The original pattern. Cheap to write, but missing variables fail late and
  individually, and the set of required variables is undiscoverable.
- **Capability-optional fields validated at first use / silent no-op**: Rejected — production misconfiguration looks like “Slack is quiet”
  or fails on the first gift-card checkout instead of at deploy.
- **Per-feature env modules**: One env helper per feature area. Avoids one big interface but reintroduces the discoverability problem and
  duplicates validation logic.
- **Runtime-injected env on `ServerRuntime`**: Cleanest DI, but `db`, `boss`, and other modules are exported as module-level constants in
  this codebase. Migrating them to factory functions is a larger refactor than the value justifies.

## Consequences

- Validation happens once, at startup. A misconfigured deployment fails immediately with a clear multi-line list of missing variables.
- Local/dev uses `EMAIL_TRANSPORT=console`, `SLACK_TRANSPORT=console`, and `WHATSAPP_TRANSPORT=console` so Resend/Slack/WhatsApp credentials
  are not required. Observability defaults to `LANGFUSE_TRANSPORT=off` and `OTEL_TRANSPORT=off` so Langfuse/Grafana keys are not required.
- `process.env` access is centralized — an ESLint `no-restricted-syntax` rule bans `process.env` reads everywhere except
  `environmentVariablesCreate.ts`. Build-time configs (`drizzle.config.ts`) and tests call `environmentVariablesCreate()` like everything
  else.
- Tests can import `environmentVariablesCreate` and inject `environmentVariablesTestSource()`, so unit tests do not depend on `.env` files.
  Integration tests that need real env values should read them from the shell environment / `.env.test`.
