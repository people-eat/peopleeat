# Real-Time (Subscriptions)

## Context

The application needs real-time updates for user state changes and AI generation streaming. The transport must work through standard HTTP
infrastructure without requiring WebSocket upgrades.

## Decision

GraphQL subscriptions over Server-Sent Events (SSE), backed by PostgreSQL NOTIFY/LISTEN for pub-sub.

### Data Flow

1. Client initiates a subscription via the URQL SSE exchange, which sends a POST to `/api/stream`
2. The server route creates a `ReadableStream` and starts the subscription
3. `executeGraphQLSubscription()` calls the resolver's `subscribe` method
4. The resolver calls `serverRuntime.subscribe.to(key)`, which returns an `AsyncIterableIterator` from `PubSubPostgres`
5. `PubSubPostgres` issues `LISTEN "key"` on a dedicated PostgreSQL connection
6. When something publishes (e.g., `serverRuntime.publish.chatTurnUpdates()`), `PubSubPostgres` calls `SELECT pg_notify($1, $2)`
7. PostgreSQL delivers the notification to the listener connection
8. The payload flows through the `AsyncIterableIterator` back to the SSE stream as `event: next\ndata: {...}\n\n`
9. The URQL SSE client receives the event and updates the React component

### PubSubPostgres Design

Key design decisions in `src/server/graphql/PubSubPostgres.ts`:

- **Dedicated listener connection**: LISTEN requires a long-lived connection that is not pooled. A separate `pg.Client` is used for
  listening while the pool handles publishing and regular queries.
- **Lowercase channel normalization**: PostgreSQL folds unquoted identifiers to lowercase, but `pg_notify()` takes a text parameter with no
  folding. All channel names are normalized to lowercase to prevent mismatches.
- **Ref-counted LISTEN/UNLISTEN**: Multiple subscribers to the same channel share a single `LISTEN`. The channel is only `UNLISTEN`ed when
  the last subscriber disconnects.
- **Per-trigger lock**: A promise chain per channel prevents concurrent subscribe/unsubscribe operations from racing.
- **PubSubMemory**: An in-memory `EventEmitter`-based alternative for testing or environments without PostgreSQL.

### SSE Stream Details

The `/api/stream` endpoint (`src/routes/api/stream.ts`):

- Sends an initial padding comment (2048 spaces) to force proxy flush
- Formats events per GraphQL-over-SSE: `id: N\nevent: next\ndata: JSON\n\n`, then `event: complete\ndata:\n\n` when the iterator ends (or
  after a setup/runtime error framed as a `next` with `errors`)
- Sends SSE comment keep-alive pings (`:\n\n`) every 12s so idle proxies do not drop long-lived subscriptions
- Properly cleans up the subscription iterator when the client disconnects (`cancel()` on the `ReadableStream`)
- Handles controller-closed / client-abort errors gracefully (no error frame, no `Logs` noise)

**Wire-format pitfall:** graphql-sse requires a named `event` (`next` | `complete`) on every message. A bare `data: …\n\n` frame makes the
browser client throw `Missing message event`, which then shows up as `client graphql: …Updates: Missing message event` via RUM — masking the
real subscription failure. Always emit `event: next` for ExecutionResults (including `{ errors }`).

### Subscription Channels

Currently defined in `ServerRuntime.publish` (see `src/server/domain/serverRuntimeCreate.ts`):

| Channel           | Trigger Key                                     | Wire payload                       | GraphQL delivery                                                                                                    | Use Case                                       |
| ----------------- | ----------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `sessionUpdates`  | `{sessionId}` via `session-updates:{sessionId}` | `{}`                               | Resolver reloads Session from DB, syncs SSE `requestingSession.userId`, then resolves `user` / OTP from that reload | Log-on OTP / register / gift-card checkout UI  |
| `userUpdates`     | `{userId}`                                      | `{}`                               | (reload / invalidate)                                                                                               | User state changes                             |
| `adminUpdates`    | `admin-updates` (shared)                        | `{}`                               | Resolver returns `Admin` shell                                                                                      | Admin catalog writes (legal drafts/publish, …) |
| `chatTurnUpdates` | `chat-turn-updates:{chatId}`                    | `{ chatId, chatTurnId, revision }` | Resolver reloads turn aggregate → `GqlSChatTurnUpdate`                                                              | Assistant turn streaming / continue / complete |

Publish puts a **wire payload** on NOTIFY (pg_notify is capped at 8000 bytes) — see [chat.md](./chat.md). The subscription resolver reloads
the turn aggregate before delivering GraphQL types. The `chat-turn-updates:` prefix namespaces channels by chat id; `userUpdates` publishes
directly against the user id with no prefix.

**Auth pitfall (fixed):** HTTP mutations bind `Sessions.userId`, but the SSE connection keeps an in-memory `requestingSession` from connect
time. `sessionUpdates` must reload the row from DB and resolve `Session.user` from that parent `userId` — not from the stale SSE context —
or the client briefly looks anonymous again after register / OTP bind.

### Key Files

- `src/server/domain/ServerRuntime.ts` — typed publish/subscribe interface (`chatTurnUpdates` wire payload)
- `src/server/domain/serverRuntimeCreate.ts` — wiring PubSubPostgres into ServerRuntime
- `src/server/graphql/resolversCreate.ts` — subscription resolver definitions
- `src/server/lib/chatTurnUpdatesSubscribe.ts` — chat-turn subscription filter + aggregate reload
- `src/web/chat/useChatTurnLiveUpdates.tsx` — client revision merge
- `src/routes/api/stream.ts` — SSE endpoint
- `src/web/graphql/client.ts` — URQL SSE client configuration

## Alternatives Considered

- **WebSockets (e.g., graphql-ws)**: More common for GraphQL subscriptions but requires WebSocket upgrade support from all infrastructure
  (load balancers, proxies). SSE works over standard HTTP.
- **Polling**: Simpler but higher latency and server load; unsuitable for token-by-token AI streaming
- **Redis pub-sub**: More scalable for multi-process deployments but adds an infrastructure dependency. PostgreSQL NOTIFY/LISTEN is
  sufficient for single-server deployment via Coolify.

## Consequences

- SSE is unidirectional (server to client) — client-to-server communication still goes through mutations
- PostgreSQL NOTIFY payload is limited to ~8000 bytes — large payloads must be chunked or referenced by ID
- Single listener connection means a single point of failure for all subscriptions — the reconnection logic handles this but there is a
  brief gap

## Client Consumption: Seed-and-Subscribe

The pub-sub plumbing is only half the contract. The other half is that the client treats the subscription payload as the source of truth —
the route loader seeds initial state, and every server push **replaces** that state. Mutations never re-fetch from the client side.

### The Pattern

For any page that displays owned data kept fresh via `userUpdates` (or a similar channel):

1. Define a `fragment <Page>User on User` in the page's `.graphql` file capturing the page's exact selection.
2. The route's load query spreads that fragment under `currentSession.user`:
   ```graphql
   query <Page> {
       currentSession { user { ...<Page>User } }
   }
   ```
3. A sibling subscription on `userUpdates` spreads the same fragment — the payload type matches the seed type:
   ```graphql
   subscription <Page>Updates {
       userUpdates { ...<Page>User }
   }
   ```
4. The page uses `useUserUpdatesSeed(seed, UpdatesDocument, variables?)` from `src/web/hooks/useUserUpdatesSeed.ts`. That helper:
   - seeds React state from the loader fragment
   - **re-seeds** when the loader delivers a new fragment (do not leave `useState(seed)` stuck after a remount/loader refresh)
   - replaces state on every SSE push via imperative `client.executeSubscription` + `pipe(subscribe(...))` from `wonka` — **never**
     `useSubscription` (URQL's declarative hook can deliver each event more than once under concurrent React)
   - **Seed identity must be stable across renders.** Pass the loader fragment (or a `useMemo`'d projection). An inline object literal like
     `{ userId: seed.userId, status: seed.status }` is a new reference every render, re-runs the re-seed `setState`, and trips "Maximum
     update depth exceeded" (see `ProfileLayout` ban-status probe).
5. Seed the **User fragment**, then derive entity slices (`cook`, `meal`, `bookingRequest`, …). Do not hold parallel cook/request state that
   can drift from the subscribed user.
6. Parametric detail/edit routes remount on entity id change (`key={mealId}` / `key={menuId}` / … on the page component) so seed cannot
   stick across A→B navigation before the next push.
7. **Edit forms:** subscription may refresh catalog slices (e.g. `cook.meals` for a meal picker). Do **not** `form.reset` while the form is
   dirty. Reset only when `!isDirty`, or navigate away when the owned entity becomes null (deleted).
8. Mutations call the server and return. They do **not** call `router.invalidate()`, refetch, or optimistically patch owned state (no local
   `onMealCreated` appends, no mutation-response `setState` for catalog rows). Commands that own the data publish
   `serverRuntime.publish.userUpdates({ userId })` after commit — the subscription closes the loop **on the subscribed page**.
9. **Cross-page `returnTo`:** if page A unmounts (drops its `userUpdates` subscription), page B mutates and publishes, then navigates back
   to A via safe `returnTo`, A missed the push. Before that navigation, `router.clearCache({ filter })` for A's route ids so the next match
   cannot remount on a pre-mutation loader snapshot (see menu edit → offer create / edit-menus). Do **not** rely on `router.invalidate()`
   alone here: with default stale-while-revalidate, A briefly (or stuck) reseeds from the cached pre-mutation fragment and the new row is
   missing until a full refresh. Destination routes that seed-and-subscribe after `returnTo` also set
   `loader: { handler, staleReloadMode: 'blocking' }` so browser-back cannot SWR the same stale seed. Same-page mutations still must not
   invalidate or clearCache.

Admin catalog pages use the same loop on `adminUpdates` with an `Admin` fragment (seed under `currentSession.user.admin`, subscribe to
`adminUpdates`, publish `serverRuntime.publish.adminUpdates()` after commit).

### Reference Implementations

- `src/web/hooks/useUserUpdatesSeed.ts` — shared `userUpdates` seed-and-subscribe helper.
- `src/web/hooks/useSessionUpdatesSeed.ts` — shared `sessionUpdates` seed-and-subscribe helper (OTP / session-owned auth UI).
- `src/web/chat/useChatTurnLiveUpdates.tsx` — assistant chat turn snapshot merge (`chatTurnUpdates`).
- `src/web/pages/admin/AdminLegalDocumentPage.tsx` — admin legal kind hub seed-and-subscribe via `adminUpdates`.
- `src/web/pages/admin/AdminLegalDraftPage.tsx` / `AdminLegalVersionPage.tsx` — same catalog subscription for draft editor and published
  version view.
- `src/web/pages/profile/ProfileCookMealsPage.tsx` / `ProfileCookMealPage.tsx` — cook-owned meals via `userUpdates`.
- `src/web/pages/profile/ProfileCookMenusPage.tsx` / `ProfileCookMenuPage.tsx` — cook-owned menus via `userUpdates`.

### Session-owned auth UI

The sign-in page follows the same seed-and-subscribe contract as other live surfaces: loader seeds `currentSession` (including
`authEmailOtp`), `sessionUpdates` replaces that state, and mutations only publish after commit — they never optimistically open/close the
OTP dialog.
