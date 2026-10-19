# Admin database slow statements

Operators inspect aggregate Postgres query cost via `pg_stat_statements` without opening a SQL shell.

## Behavior

`Admin.databaseSlowStatements(limit)` returns the top statements by total execution time (query text, calls, total/mean ms, rows). When the
extension is not installed, the field returns an empty list and a warn log is recorded.

No dedicated admin UI page in v1 — GraphQL / explorer is enough alongside the Grafana per-request SQL spans. Runbook SQL lives in
[architecture/observability.md](../architecture/observability.md).

## Decisions

| Option                           | Why                                                                     |
| -------------------------------- | ----------------------------------------------------------------------- |
| Soft-fail when extension missing | Local/test DBs often lack `shared_preload_libraries`                    |
| Cap `limit` at 100               | Avoid dumping the whole statements table                                |
| No UI page yet                   | Operators who need this already use GraphQL; Grafana covers per-request |

## Implementation

- Query: `src/server/queries/databaseSlowStatementsFindMany.ts` + admin wrapper
- Schema: `AdminDatabaseSlowStatement` on `Admin`
- Architecture: [observability.md](../architecture/observability.md)
