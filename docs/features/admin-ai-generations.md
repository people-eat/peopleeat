# Admin AI generations

Admins audit one-shot LLM calls — prompts, outputs, models, and tokens — across chat titling, booking-request adjusted messages, and other
recorded kinds.

## Behavior

### Overview — `/admin/ai-generations`

- Counts by kind (total plus each generation kind) and a creation bar chart.
- Date range in the URL (`from` / `to`, default previous calendar month start through current month end); daily buckets zero-filled.
- Section card links to the list (also in the sidebar). Distribution cards deep-link into the list with `kind` preselected (Total clears the
  filter).

### List — `/admin/ai-generations/list`

- Breadcrumbs and document title carry context (no page headline).
- Search system / prompt / output text (debounced URL `q`).
- Filter by kind via tabs (URL `kind`; omit for all).
- Paginated sortable table (25 per page; URL `sort` / `dir` on time, kind, model, tokens). Default newest first omits sort keys from URL.
- Kind badges, model id, token totals, optional user for attribution.
- Row or chevron → detail for full system / prompt / output.

### Detail — `/admin/ai-generations/<id>`

- Full-width pane: kind, timestamps, model, token breakdown, optional user / session links, monospace system / prompt / output blocks.

Non-admins never reach these fields.

## Decisions

### Alternatives considered

| Option                                                | Pros                                   | Cons                                     |
| ----------------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| Dedicated admin generation type under admin namespace | Clear privilege boundary; mirrors logs | Parallel type for one consumer           |
| Truncate prompts in storage                           | Smaller rows                           | Blocks prompt debugging                  |
| Store full prompts always                             | Complete audit                         | Storage and PII — retention policy later |
| Hub + list + detail                                   | Matches logs / sessions                | Extra routes                             |

### Chosen

Dedicated admin AI generation type with find-one, find-many, counts, and creation time series. Full prompts stored. Same navigation
hierarchy as logs: overview, list, detail; sidebar sub-link for list.

## Implementation

- SDL: `AdminAiGeneration`, `AdminAiGenerationKind`, `AdminAiGenerationCriterion`, and admin queries in `src/server/graphql/schema.graphqls`
- Queries: `adminAiGenerationFindOne` / `FindMany` / `Counts` / `CreationsFindMany`; `adminAiGenerationCriterionWhere` /
  `adminAiGenerationOrderBy`
- Mapper: `toGqlAdminAiGeneration`
- Resolvers under `Admin` and nested user / session on generation rows
- UI: overview / list / detail pages; `adminAiGenerations.ts`, columns, data table
- Routes: `ai-generations.tsx`, `ai-generations_.list.tsx`, `ai-generations_.$aiGenerationId.tsx`
- Writer / table: [architecture/ai-generations.md](../architecture/ai-generations.md)

GraphQL: `aiGenerations(criterion)` with `searchText`, required `kinds` filter (empty list matches nothing), sort, pagination.
`aiGenerationCounts(criteria)`, `aiGenerationCreations(range, granularity)`, `aiGeneration(id)`.

Gate: [authorization-admin.md](../architecture/authorization-admin.md).
