# Admin Access

## Context

Many products built on this template grow two surfaces:

- **Public** — marketing pages, signed-in app areas open to every authenticated user, visitor chat, etc.
- **Admin** — privileged operators (content editors, support, personal-assistant tooling). Must not be reachable by non-admins.

Both surfaces typically share one GraphQL schema. Admin **reads** often hang off a nullable field on the current user (e.g. `User.admin`);
admin **writes** live under `Mutation.admin`. Something has to stop non-admin callers from resolving fields under those namespaces.

This ADR records the gate. Forks that never need an admin surface can ignore it until the first privileged namespace lands.

## Decision

Admin membership is a 1:1 extension of `Users`: a row in `Admins` whose `adminId` equals `Users.userId`. Access is: the current session has
a `userId`, and that id appears as a primary key in `Admins`.

- **Reads.** `User.admin: Admin` is nullable. The `User.admin` resolver returns the `Admin` shell only when the requesting session owns the
  parent user row **and** an `Admins` row exists for that `userId`; otherwise `null`. Because the field is nullable, a non-admin caller gets
  `sessionFindOne.user.admin = null` instead of an exception — public pages can compose the probe and decide whether to surface an admin
  entry point. Admin pages gate in the parent `/admin` loader: unsigned visitors redirect to `/sign-in?returnTo=…`, signed-in non-admins
  redirect to `/profile`, and only a non-null `admin` renders the shell. `Admin.adminId: ID!` (equals `Users.userId`) is the identity /
  presence probe; domain reads hang beside it (`Admin.users` / `Admin.userCounts` / `Admin.user` → `AdminUser`; `Admin.sessions` /
  `Admin.sessionCounts` / `Admin.session` → `AdminSession`; `Admin.assistantChats` / `Admin.assistantChatsCounts` /
  `Admin.assistantChatCreations` / `Admin.assistantChat` → `AdminAssistantChat`; `Admin.log` / `Admin.logs` / `Admin.logCounts` →
  `AdminLog`).
- **Writes.** `Mutation.admin: AdminMutation!` is non-nullable and gated by `guardAdminMutation`, which throws on non-admins. Writes are not
  composable from the public surface, so the throw-on-mismatch contract is correct there. The guard stamps `adminId` onto the parent via
  `extensions.ts` (TypeScript-only; not on the SDL) so child commands can authorize without re-deriving identity. **Every admin catalog
  write publishes `adminUpdates()` after commit** (seed-and-subscribe on `Admin`); public / anonymous chat mutations stay quiet when there
  is no `User` to refresh.

```ts
// src/server/db/schema.ts
export const admins = pgTable(
  'Admins',
  {
    adminId: uuid().primaryKey(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.adminId],
      foreignColumns: [users.userId],
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);
```

```ts
// User.admin — wired in resolversCreate → userAdminFindOne
async function userAdminFindOne(parentUser, requestingSession, serverRuntime) {
  if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) return null;
  const [row] = await serverRuntime.db
    .select({ adminId: admins.adminId })
    .from(admins)
    .where(eq(admins.adminId, parentUser.userId))
    .limit(1);
  return row ? ({ adminId: row.adminId } as GqlSAdmin) : null;
}
```

Membership is granted out-of-band (`INSERT INTO "Admins" ("adminId") VALUES (…)` or equivalent) and revoked by deleting the row. How
membership is managed is out of scope for the gate itself — the gate only checks for the row.

### Why a dedicated `Admins` table

- The PK is also the FK to `Users.userId`, so membership is at most one row per user (true 1:1) without a separate unique constraint.
- Extra columns (roles, scopes, audit fields) can land on `Admins` without widening `Users`.
- Reads cost one PK lookup per resolved `User.admin` / `Mutation.admin`, at most once per GraphQL request.
- Cook membership uses the same pattern (`Cooks.cookId` = `Users.userId`).

### Why the read side returns null instead of throwing

A top-level `Query.admin: Admin!` gated by a throwing guard makes it impossible to ask "is this user an admin?" from a public page without
catching a GraphQL error. Nullable `User.admin` turns admin-ness into a regular composable query.

### Anonymous sessions

Sessions without a `userId` resolve `sessionFindOne.user = null`, so `sessionFindOne.user?.admin` never reaches the `User.admin` resolver.

## Alternatives Considered

- **Permissive guard + obscurity** (`noindex` + unlinked URL). Rejected once the admin surface hosts real privileged data or tools.
- **Top-level `Query.admin: Admin!` gated by `guardAdmin`.** Incompatible with composing the field on public pages.
- **Boolean `Users.isAdmin` column.** Worked for a single fact; replaced by `Admins` once membership needed its own table shape (and so cook
  membership could mirror the same 1:1 pattern).

## Consequences

- Adding a new admin is typically a manual `INSERT` (or equivalent) until a richer membership model exists.
- Forgetting to insert an `Admins` row locks that user out of admin UI until the row is written — recovery is a DB write, not a code change.
- The `User.admin` resolver does a DB read per request that selects the field; cost is negligible.
- Deleting a `Users` row cascades the matching `Admins` (and `Cooks`) row away.

## Key Files (when adopted)

- `src/server/db/schema.ts` — `admins` (and `cooks`) tables
- `src/server/graphql/schema.graphqls` — `User.admin` / `User.cook` (nullable presence probes) and `Admin` / `Cook` shells
- `src/server/graphql/resolversCreate.ts` — `User.admin` / `User.cook` resolvers and `Mutation.admin` guard call site
- `src/server/guards/guardAdminMutation.ts` — write namespace gate
- `src/server/queries/adminUserFindMany.ts` / `adminUserCounts.ts` / `adminUserFindOne.ts` — admin user list, counts, and detail
- `src/server/queries/adminSessionFindMany.ts` / `adminSessionCounts.ts` / `adminSessionFindOne.ts` — admin session list, counts, and detail
- `src/server/queries/adminLogFindMany.ts` / `adminLogCounts.ts` / `adminLogCreationsFindMany.ts` / `adminLogFindOne.ts` — admin persistent
  log list, counts, weekly creations, and detail
- Parent route loader gate: `src/routes/{-$locale}/admin.tsx` (unsigned → sign-in with `returnTo`; non-admin → profile)
- Shared `returnTo` helpers: `src/web/utils/returnTo.ts`
- Admin shell: `src/web/pages/admin/AdminLayout.tsx`, `src/web/components/AdminSidebar.tsx`, `AdminPageChrome.tsx` — see
  [features/admin-shell.md](../features/admin-shell.md)
- UI: `AdminUsersOverviewPage`, `AdminUsersPage` (list), `AdminUserCreatePage`, `AdminUserPage`; routes `users.tsx`, `users_.list.tsx`,
  `users_.create.tsx`, `users_.$userId.tsx` — see [features/admin-users.md](../features/admin-users.md)
- UI: `src/web/pages/admin/AdminSessionsPage.tsx`, `AdminSessionPage.tsx`; routes `src/routes/{-$locale}/admin/sessions.tsx`,
  `sessions_.$sessionId.tsx`
- UI: `AdminLogsOverviewPage`, `AdminLogsPage` (list), `AdminLogPage`; routes `logs.tsx`, `logs_.list.tsx`, `logs_.$logId.tsx` — see
  [features/admin-logs.md](../features/admin-logs.md)
- Public admin entry: `src/web/components/PublicSessionNav.tsx` (shown when `User.admin` is non-null)

See also [authorization.md](./authorization.md) for the general guard pattern. User-list behavior:
[features/admin-users.md](../features/admin-users.md). Session reads: [features/admin-sessions.md](../features/admin-sessions.md). Log
reads: [features/admin-logs.md](../features/admin-logs.md).
