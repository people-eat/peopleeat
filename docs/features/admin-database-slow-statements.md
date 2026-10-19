# Admin database slow statements

Operators inspect aggregate Postgres query cost via `pg_stat_statements` without opening a SQL shell.

## Behavior

`Admin.databaseSlowStatements(limit)` returns the top statements by total execution time (query text, calls, total/mean ms, rows). When the
extension is not installed, the field returns an empty list and a warn log is recorded.

Admin UI at `/admin/database-slow-statements` (sidebar: Platform → Slow SQL) shows the top 50 rows with a refresh control. Empty state when
the extension is missing or stats are empty. Runbook SQL lives in [architecture/observability.md](../architecture/observability.md). Grafana
still covers per-request SQL spans.

## Decisions

| Option                           | Why                                                            |
| -------------------------------- | -------------------------------------------------------------- |
| Soft-fail when extension missing | Local/test DBs often lack `shared_preload_libraries`           |
| Cap `limit` at 100               | Avoid dumping the whole statements table                       |
| Admin table, fixed limit 50      | Enough for ops triage; GraphQL still accepts `limit` up to 100 |
| No sort/filter in v1             | Server already ranks by total time; mean is visible for triage |

## Implementation

- Page: `src/web/pages/admin/AdminDatabaseSlowStatementsPage.tsx` (+ `.graphql`)
- Route: `src/routes/{-$locale}/admin/database-slow-statements.tsx`
- Nav: `adminCatalog` slug `database-slow-statements` (Platform group)
- Query: `src/server/queries/databaseSlowStatementsFindMany.ts` + admin wrapper
- Schema: `AdminDatabaseSlowStatement` on `Admin`
- Architecture: [observability.md](../architecture/observability.md)
