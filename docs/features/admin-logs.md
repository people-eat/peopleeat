# Admin logs

Operators search persistent application logs by severity, inspect context, and jump to the affected user or session.

## Behavior

Admins manage log rows under `/admin/logs` (overview + list + detail), with a sidebar sub-link to the list.

### Overview — `/admin/logs`

Level distribution (total, error, warn, info, debug) and log-creation bar chart. Date range drives zero-filled buckets. Section card links
to the list. Distribution cards deep-link into the list with `level` preselected (Total clears the filter).

### List — `/admin/logs/list`

Search message text. Tabs filter by level. Sortable table (default created desc) with pinned bottom pagination (`page` / `pageSize`; default
25). Level badges and optional user from linked session for at-a-glance attribution. Row or chevron → detail; in-cell user links do not
trigger row navigation.

### Detail — `/admin/logs/<logId>`

Message, level, timestamps, optional user/session links, full context JSON.

Non-admins cannot access admin log APIs.

## Decisions

### Alternatives considered

| Option                            | Pros                   | Cons                |
| --------------------------------- | ---------------------- | ------------------- |
| Shared log type on public API     | One shape              | Logs are admin-only |
| Dedicated admin log type (chosen) | Clear boundary         | Single consumer     |
| Flat list args                    | Simple                 | Criterion scales    |
| `AdminLogCriterion` (chosen)      | Matches users/sessions | Nesting in clients  |
| Throw when detail missing         | Fail-fast              | Harder UX           |
| Nullable detail (chosen)          | Matches users/sessions | Soft miss           |
| Raw session id in list            | Cheap                  | Opaque attribution  |
| Session user in list (chosen)     | Glanceable             | Nested resolve      |
| List-only at `/admin/logs`        | Fewer hops             | No stats hub        |
| Hub + list + detail (chosen)      | Matches sessions       | Extra routes        |

### Chosen

Dedicated admin log + criterion; enum levels matching server logger; overview + list showing session user; context JSON on detail only.

## Implementation

- SDL: `AdminLog`, levels, criterion, creations in `schema.graphqls`
- Queries: find one/many, counts, creations; `adminLogCriterionWhere`
- Mapper: `toGqlAdminLog`; `AdminLog.session` → admin session
- UI: overview, list with level tabs + data table, detail
- Routes: `logs.tsx`, `logs_.list.tsx`, `logs_.$logId.tsx`
- Nav: `adminLogs.ts` — [admin-shell.md](./admin-shell.md)
- Writer: `Logs` table + `loggerCreate` — [logging.md](../architecture/logging.md)

GraphQL: `logs(criterion)` — message search, required levels array (empty = none; all levels = unfiltered), sort, paginate; `logCounts`;
`logCreations`; `log(id)`.

Gate: [authorization-admin.md](../architecture/authorization-admin.md).
