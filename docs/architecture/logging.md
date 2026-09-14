# Persistent Logging

## Context

Commands and agents need durable, queryable error/event records. Console-only logging disappears on container restart; an external vendor
adds cost and another dependency for a project that already runs PostgreSQL.

## Decision

**PostgreSQL-backed logging** with dual console output, exposed as `ServerRuntime.log` from `loggerCreate(db)`.

Four levels: `error`, `warn`, `info`, `debug`. Rows land in the `Logs` table (`src/server/db/schema.ts`). Inserts are fire-and-forget so
logging never blocks a request; insert failures fall back to `console.error`.

## Alternatives Considered

| Option                             | Why rejected                             |
| ---------------------------------- | ---------------------------------------- |
| Console-only                       | Ephemeral; gone on restart               |
| External service (Datadog, Sentry) | Extra infra/cost for current stage       |
| File-based logs on the container   | Harder to query; lost on ephemeral disks |

## Consequences

- Logs are queryable with ordinary SQL / GraphQL and backup with the rest of the DB.
- High-volume `debug` in production can grow the table — add a retention policy when needed.
- Admins read rows via `Admin.log` / `Admin.logs` / `Admin.logCounts` / `Admin.logCreations` (`AdminLog`); see
  [features/admin-logs.md](../features/admin-logs.md).

## How it works

### Database table

| Column      | Type                       | Notes                                       |
| ----------- | -------------------------- | ------------------------------------------- |
| `logId`     | `uuid` (PK)                | Generated per log entry                     |
| `sessionId` | `uuid`                     | Optional session that triggered the log     |
| `level`     | `varchar` NOT NULL         | `'error'` / `'warn'` / `'info'` / `'debug'` |
| `message`   | `varchar` NOT NULL         | Human-readable message                      |
| `context`   | `jsonb`                    | Optional structured metadata                |
| `createdAt` | `timestamp with time zone` | Defaults to `now()`                         |

### Logger

Defined in `src/server/utils/loggerCreate.ts`. `Error` instances become `message` + stack context; other values are stringified. Commands
pass the error and requesting session:

```ts
catch (error) {
    serverRuntime.log.error(error, requestingSession);
    throw error;
}
```

Expected denials that return `{ success: false }` (e.g. passkey unknown credential) use `log.warn` instead so they stay queryable without
looking like unexpected failures.

### GraphQL (admin reads)

`AdminLog` / `AdminLogLevel` / `AdminLogCriterion` / `AdminTimeBucket` hang under `User.admin`. Writers stay on `ServerRuntime.log`; there
is no log mutation. `AdminLog.session` resolves the optional `AdminSession` (and through it `session.user`).

### Key files

- `src/server/db/schema.ts` — `logs` table
- `src/server/utils/loggerCreate.ts` — factory
- `src/server/domain/ServerRuntime.ts` / `serverRuntimeCreate.ts` — `log` on the DI container
- `src/server/queries/adminLogFindOne.ts` / `adminLogFindMany.ts` / `adminLogCounts.ts` / `adminLogCreationsFindMany.ts` — admin GraphQL
  reads
- `src/server/mappers/toGqlAdminLog.ts` — DB → `AdminLog`
