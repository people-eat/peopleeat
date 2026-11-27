# Admin sessions

Operators triage browser and bot sessions, attribution, and links back to user accounts.

## Behavior

Admins manage sessions under `/admin/sessions` (overview + list + detail; no create), with a sidebar sub-link to the list.

### Overview — `/admin/sessions`

Kind distribution (total, human, bot) and session-creation bar chart. Date range drives zero-filled buckets. Section card links to the list.
Distribution cards deep-link into the list with `kind` preselected (Total clears the filter).

The insights heading has an **Analytics** button to `/admin/analytics?tab=sign-in` with the same `from` / `to`. Below the chart,
**insights** for human non-impersonation sessions created in the same range:

- Top first-touch landing paths and referrers (blank referrer = Direct; rows deep-link into the human list with `q`)
- Device class (mobile / tablet / desktop), operating system, and browser family inferred from `userAgent` (coarse Postgres heuristics, not
  Client Hints)

### List — `/admin/sessions/list`

Search by session id, user id, user agent, landing path, referrer, or IP hash. Tabs filter human vs bot. Sortable table (default created
desc) with pinned bottom pagination (`page` / `pageSize`; default 25); columns: user (link or Anonymous), user agent, status, last active —
session id omitted from list. Row or chevron → detail.

### Detail — `/admin/sessions/<sessionId>`

Two tabs (URL `tab`): **overview** (default) and **events**. Overview shows attribution and lifecycle fields with copy buttons; signed-in
accounts show avatar + display name (no email) and an explicit link to the user page. Events is a paginated list (`page` / `pageSize`;
default 25) of first-party `SessionEvents` (page visits, booking-form steps, booking lifecycle, auth / account events, plus historical
imported keys). See [session-events.md](../architecture/session-events.md) and [admin-analytics.md](./admin-analytics.md).

### Related

User detail **sessions** tab lists sessions for that account (same filters, scoped by user) and can revoke individual sessions or terminate
all active ones via `AdminMutation.terminateSessions`.

Non-admins cannot access admin session APIs; layout gates `/admin/*`.

## Decisions

### Alternatives considered

| Option                                | Pros                  | Cons                     |
| ------------------------------------- | --------------------- | ------------------------ |
| Reuse public session types            | Fewer types           | Mixed surfaces           |
| Dedicated admin session type (chosen) | Safe to extend        | Parallel type            |
| Side sheet on list                    | Stay on list          | Weak deep links          |
| Detail page (chosen)                  | Shareable URL         | Extra route              |
| List-only at `/admin/sessions`        | Fewer hops            | No stats hub             |
| Hub + list (chosen)                   | Matches users pattern | List not sidebar default |
| Raw user id column only               | Cheap                 | Opaque triage            |
| Nested user on session (chosen)       | Name at a glance      | Extra resolve per row    |

### Chosen

Dedicated admin session with nested admin user when `userId` set; criterion bag for list/counts; overview chart + list + detail; full-width
list layout.

## Implementation

- SDL: `AdminSession`, kinds, criterion, creations, `AdminSessionInsights` (+ landing / referrer / device / OS / browser stats) in
  `schema.graphqls`
- Queries: find many, counts, creations, insights, find one; `adminSessionCriterionWhere`
- Mapper: `toGqlAdminSession`; field resolver `AdminSession.user` → `adminUserFindOne`
- UI: overview (distribution + chart + insights; range-preserving link to Analytics `tab=sign-in`), list with kind tabs + data table, detail
  page
- Routes: `sessions.tsx`, `sessions_.list.tsx`, `sessions_.$sessionId.tsx`
- Nav: `adminSessions.ts` — [admin-shell.md](./admin-shell.md)

GraphQL: `sessions(criterion)` — search, kinds, optional user ids, sort (including by user last name), paginate; `sessionCounts`;
`sessionCreations`; `sessionInsights(range, take)`; `session(id)`; detail events tab loads
`sessionEvents(criterion: { sessionIds, skip, take })` + `sessionEventsCounts`. Kinds: human (`isBot` false), bot true. Writes:
`AdminMutation.terminateSessions` (any session ids; publishes `userUpdates` + `adminUpdates`). Command: `adminSessionTerminateMany`.

Gate: [authorization-admin.md](../architecture/authorization-admin.md).
