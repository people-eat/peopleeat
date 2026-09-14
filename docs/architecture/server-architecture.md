# CQRS (Command Query Responsibility Segregation)

## Context

GraphQL resolvers can grow complex when mutations (writes) and queries (reads) share the same code structure. Mapping logic between database
types and GraphQL types is often duplicated across both.

## Decision

Separate server-side logic into three directories:

- **`src/server/commands/`** — mutation resolvers (write operations)
- **`src/server/queries/`** — query resolvers (read operations)
- **`src/server/mappers/`** — shared transformation functions

### Commands

Each file exports a single async function that performs a write operation. Commands may:

- Insert, update, or delete database records
- Call AI agents from `src/server/agents/`
- Publish events via `ServerRuntime.publish`
- Return GraphQL types (using mappers for the transformation)
- Export a colocated AI-SDK `tool()` factory (`tool<Domain><Action>`) when a sub-agent needs to call the same write — see
  [agent-delegation.md](./agent-delegation.md)

Example: `sessionUpsert.ts` creates or updates a session and returns `GqlSSession`.

### Queries

Each file exports a single async function that performs a read operation. Queries:

- Select from the database
- Transform results using mappers
- Return GraphQL types
- Call shared hydrators under `src/server/utils/` (`*Hydrate`) when nested GraphQL fields need batch-loaded related rows — never colocate
  that helper in the query file

Resolver-mounted query files follow `{accessPath}{Entity}{FindOne|FindMany|Count|Counts}` (see
[conventions.md](../conventions.md#query-naming)). **Only resolver-wired functions live under `src/server/queries/`** — shared helpers
(filter builders, batch loaders / hydrators, route loaders) belong in `src/server/utils/` or `src/server/db/`. **One function per file** —
`FindMany` and `FindOne` are separate modules even when they share a hydrator.

Example pattern: `userFindOne.ts`, `sessionFindMany.ts`, `adminBookingRequestHydrate.ts` (utils). **Commands and queries must not import
each other.** A command that needs a read either inlines the `select` or calls a shared helper that lives outside `queries/` (for example
under `src/server/db/` — `chatMessageRowsLoad` / `fileUploadLoad` — or `utils/` / `mappers/`). ESLint enforces both directions via
`no-restricted-imports` in `eslint.config.js`.

### Mappers

Pure functions that transform a database row type to its corresponding GraphQL type. Named `toGql{Entity}`.

Example: `toGqlSession(session: Session): GqlSSession`

Mappers are shared by both commands and queries, eliminating duplicate transformation logic.

### Wiring

All functions are imported and called in `src/server/graphql/resolversCreate.ts`:

```typescript
export function resolversCreate(): GqlSResolvers {
  const serverRuntime = serverRuntimeCreate();
  return {
    Query: {
      session: (_, __, ctx) => sessionFindOne(serverRuntime, ctx),
    },
    Mutation: {
      doSomething: (_, args, ctx) => someCommand(serverRuntime, args, ctx),
    },
  };
}
```

## Alternatives Considered

- **Flat resolvers file**: Simpler but gets unwieldy quickly; no separation of read/write concerns
- **Domain-driven directories (per entity)**: Groups all session logic together but obscures the read/write separation and makes it harder
  to enforce consistency

## Consequences

- Clear separation of read and write paths
- Mappers prevent duplication and ensure consistent type transformations
- One function per file keeps each module focused and testable
- `resolversCreate.ts` is the single wiring point — it grows linearly with the schema but keeps the dependency graph visible

## Related: `src/server/domain/`

Domain types that are not Drizzle row aliases (string unions for varchar columns, JSONB payload interfaces, chat message kind catalogs) live
under `src/server/domain/`, not inline in `db/schema.ts`. The DI container (`ServerRuntime`) lives there too. Web code never imports this
folder — it consumes GraphQL-generated `GqlC*` types instead. See
[conventions.md — Column vocabulary and JSONB shapes](../conventions.md#column-vocabulary-and-jsonb-shapes) and
[dependency-injection.md](./dependency-injection.md).
