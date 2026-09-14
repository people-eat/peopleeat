# ServerRuntime

## Context

Resolver functions, commands, queries, and guards all need access to shared infrastructure: the database, pub-sub publishing, and pub-sub
subscribing. Passing these as individual parameters would create unwieldy function signatures.

## Decision

A `ServerRuntime` interface that bundles all shared infrastructure into a single dependency injection container, created once via
`serverRuntimeCreate()`.

`src/server/domain/` is the home for **server domain types** as well as the runtime: entity vocabulary (`GiftCardPaymentStatus`,
`OutboundEmailPurpose`, …) and structured JSONB shapes (`GiftCardInvoiceAddress`) that `db/schema.ts` references via `$type<>`. See
[conventions.md — Column vocabulary and JSONB shapes](../conventions.md#column-vocabulary-and-jsonb-shapes). The DI container stays in
`ServerRuntime.ts` / `serverRuntimeCreate.ts`; other files under `domain/` are entity-named type modules.

### Interface

Defined in [`src/server/domain/ServerRuntime.ts`](../../src/server/domain/ServerRuntime.ts) — that file is the source of truth for every
field. Do not mirror the full TypeScript interface in this doc; it drifts. Capability groups today:

- **`db`**: Drizzle ORM database instance for all database operations
- **`log`**: structured logger that persists records to the `logs` table (see `loggerCreate.ts`)
- **`subscribe.to(key)`**: returns an async iterator for a pub-sub channel (used by subscription resolvers)
- **`publish.*`**: typed methods for publishing to specific channels (used by commands and agents):
  - `userUpdates({ userId })` — fan-out for seed-and-subscribe reads
  - `adminUpdates()` — shared admin catalog fan-out (`admin-updates` channel)
  - `chatTurnUpdates({ chatId, chatTurnId, revision })` — assistant chat live updates. Lean **wire payload** on the NOTIFY channel
    (pg_notify caps payloads at 8000 bytes); the subscription resolver reloads the turn aggregate before delivery — see [chat.md](./chat.md)
    and [state-synchronization.md](./state-synchronization.md)
- **`jobs`**: `enqueue` (typed pg-boss job; optional `transaction` / custom `id` / `singletonKey`), `activeCount` (live queue depth for a
  definition — `created` | `retry` | `active`), `findByData` / `findById` (live pending-job lookups), `cancel` — see [jobs.md](./jobs.md)
- **`ai.*`**: factory functions returning `LanguageModel` instances. Provider, model id, and API key are bound here so tests can inject a
  `MockLanguageModelV3` (see `commandTestUtils.ts` / `aiForTest`) and never reach a real LLM endpoint. Assistant chat factories
  (`customerAssistantModel`, `cookAssistantModel`, `adminAssistantModel`, `bookingRequestAssistantModel`) are separate from one-shot
  generation factories named after the use case (`chatTitlerModel`, `cookMenuSuggestionModel`, `cookMenuTitleDescriptionModel`,
  `bookingRequestOfferCallRecordingTranscriptModel`, `cookBiographySuggestModel`, `cookBiographySummaryModel`). See
  [assistants.md](../features/assistants.md) and [ai-generations.md](./ai-generations.md). `GOOGLE_GENERATIVE_AI_API_KEY` is required at
  boot via `environmentVariablesCreate` — see [environment.md](./environment.md).
- **`browser`**: `capture` and `capturePdf` drive a singleton headless Chromium against an internal `/server/*` route — see
  [browser-capture.md](./browser-capture.md). Tests stub these to return a fixed `Buffer` and never launch a real browser.
  `SERVER_TOKEN_SECRET` is required at boot.
- **`stripe`**: Stripe Connect payment adapter (`StripePayment`) — customers, SetupIntents, PaymentIntents (incl. destination-charge
  splits), Express cook accounts, transfers, webhook signature verify. See [stripe-payment.md](./stripe-payment.md). Stripe env vars are
  required at boot. Tests stub `serverRuntime.stripe` via `commandTestUtils` and never call Stripe.
- **`klaviyo`**: Marketing profile upsert (`Klaviyo`) — create-or-update via Profiles API. `KLAVIYO_PRIVATE_API_KEY` is required at boot.
  See [klaviyo-profile-sync.md](../features/klaviyo-profile-sync.md). Not used for transactional mail (Resend).
- **`slack`**: Ops notifications. `SLACK_TRANSPORT=console` logs locally; `slack` posts via Web API (token + channels required at boot). See
  [slack-notifications.md](../features/slack-notifications.md).

### Factory

`serverRuntimeCreate()` in `src/server/domain/serverRuntimeCreate.ts` creates the runtime:

1. Initializes `PubSubPostgres` with the database connection
2. Wraps the pub-sub into typed `subscribe` and `publish` interfaces
3. Binds the LLM provider from boot-validated `GOOGLE_GENERATIVE_AI_API_KEY`
4. Wires `jobs.enqueue` / `activeCount` / `findByData` / `findById` / `cancel` to the pg-boss singleton, `browser.capture` /
   `browser.capturePdf` to the singleton-Chromium renderer, and `stripe` / `livekit` / `objectStorage` / `places` / `slack` / `klaviyo` to
   their factories
5. Returns the assembled `ServerRuntime`

### Usage Pattern

`resolversCreate()` creates a single `ServerRuntime` instance and passes it to all resolver functions:

```typescript
const serverRuntime = serverRuntimeCreate();
return {
  Query: {
    session: (_, __, ctx) => sessionFindOne(serverRuntime, ctx),
  },
  Mutation: {
    doSomething: (_, args, ctx) => someCommand(serverRuntime, args, ctx),
  },
};
```

Commands and queries receive `serverRuntime` as their first argument.

### Key Files

- `src/server/domain/ServerRuntime.ts` — interface definition
- `src/server/domain/serverRuntimeCreate.ts` — factory function
- `src/server/domain/{entity}.ts` — entity vocabulary / JSONB shapes imported by `db/schema.ts` (e.g. `giftCard.ts`, `outboundEmail.ts`)
- `src/server/graphql/resolversCreate.ts` — where the runtime is created and distributed

## Alternatives Considered

- **Global singletons**: Simpler but harder to test and makes dependencies invisible
- **GraphQL context**: Apollo context is per-request; ServerRuntime is per-process (pub-sub connections and the database pool should not be
  recreated per request)
- **Dependency injection framework**: Overkill for the current scope; a plain factory function is sufficient

## Consequences

- All shared infrastructure is discoverable through one interface
- Adding a new shared dependency means extending the `ServerRuntime` interface and updating `serverRuntimeCreate()`
- The runtime is created once at server startup (inside `resolversCreate()`), so state like pub-sub connections is shared across all
  requests
