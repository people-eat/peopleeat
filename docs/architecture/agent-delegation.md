# Agent Delegation

## Context

A single top-level agent that owns every domain tool does not scale: the system prompt grows unmanageable, and tool-selection accuracy
decays past roughly 10–15 tools. When a product needs one conversational voice across several domains (projects, media, search, …), the
orchestrator should stay thin and hand each domain off to a focused sub-agent.

This ADR records the pattern. Domain catalogs below are **illustrative placeholders** — a fork fills them with its own focus areas.
Per-domain behaviour lives in matching `docs/features/` docs once those surfaces ship.

## Decision

**The orchestrator is a router with one `delegateTo<Domain>` tool per focus area.** Each delegate tool's `execute` builds the matching
domain sub-agent in-process, calls `agent.generate({ messages })` with the user's brief as a single user message, and returns a structured
summary. The orchestrator narrates the result back to the user.

The domain sub-agent runs **synchronously inside the orchestrator's tool turn** — same process, same database connection, same Node event
loop. There is no queue, no separate session, no extra HTTP hop.

### Why in-process and not a sibling factory

Top-level chat agents (e.g. a public visitor agent and an admin personal assistant) sit at the same level: dispatched by access path, each
with its own turn plumbing and chat persistence. Adding more siblings means every domain agent manages that plumbing too, and every
cross-domain turn requires multiple top-level dispatches. In-process delegation keeps the user-visible chat at a single turn even when
several domains are touched, and sub-agents stay small because they own no chat persistence.

peopleeat’s audience top-level factories (`agentCustomerCreate`, `agentCookCreate`, `agentAdminCreate`, `agentBookingRequestCreate`) are
scaffolded under `src/server/agents/` — see [assistants.md](../features/assistants.md). They are **not** domain sub-agents; wiring into
`chatAssistantTurnRun` and the UI surfaces is still pending.

### What the sub-agent can and cannot do

- ✅ Read via its read tools and via inline snapshots in its system prompt.
- ✅ Mutate the DB via wrapped `commands/*.ts` — the same commands GraphQL resolvers use. The AI-SDK `tool()` wrapper that exposes a command
  to sub-agents lives **in the command file itself** (colocated below the command function), not in a separate `agents/toolX.ts`.
  Authorization continues to flow through the resolver namespace at the call boundary (e.g. `AdminMutation` gated by `guardAdminMutation`);
  inside that boundary commands run with the same privileged session.
- ✅ Run multiple tool calls in sequence (`ToolLoopAgent`).
- ✅ Persist tool-call rows. The sub-agent receives an `onStepEnd` from the delegate tool; every tool call lands with `parentChatMessageId`
  pointing at the delegate row, and the transcript renders them indented under the parent card. See [Nested tool calls](#nested-tool-calls).
- ❌ Persist `assistantText` rows. The sub-agent's final text is the orchestrator's `toolResult` payload — user-facing narration is the
  orchestrator's job.
- ❌ Ask the user for input mid-delegation. Instead the sub-agent returns a `needsMoreInfo` JSON sentinel and the orchestrator owns the
  back-and-forth via `promptUserForInput`.

### Illustrative domain catalog

Replace with the product's real focus areas when wiring the orchestrator:

| Delegate (example)    | Responsibility (example)                        |
| --------------------- | ----------------------------------------------- |
| `delegateToProjects`  | Projects / tasks / activity writes              |
| `delegateToMedia`     | Watchlist / library lookups and mutations       |
| `delegateToWebSearch` | Provider-backed web search (may fan out briefs) |
| `delegateTo<Domain>`  | Next focus area — same wiring shape             |

Web search is often the only delegate that fans out (`briefs: string[]` + `Promise.allSettled`). Write-heavy domains stay 1:1 so parallel
copies do not race the same tables.

### Structured results

Completed replies prefer a structured envelope the orchestrator can narrate and (when useful) map into UI body blocks:

```json
{ "status": "completed", "summary": "…", "items": [/* optional presentable cards */] }
```

Field names on `items` match CardList cards 1:1 (`title`, optional `description` / `href` / `imageUrl` / `price`). Images and links are
**copied from tool results** — never invented. The orchestrator must copy `href` onto cards whenever `items[].href` is present. Shared parse
lives in `parseSubAgentFinalText` / `parsePresentableItems` (`agentScaffolding.ts` / `presentableItems.ts`); the parser accepts a bare JSON
object, a fenced ` ```json ` block, or a `{…}` object embedded after prose. Sentinels and `failed` never carry `items`. Do not rebuild
CardList from prose / `sources` when `items` is empty. Plain-prose completed replies still work — non-JSON text becomes
`{ status: 'completed', summary: text }`.

Sentinels:

```json
{ "status": "needsMoreInfo", "missingFields": ["title"], "summary": "…" }
{ "status": "noOp", "missingFields": [], "summary": "…" }
```

`failed` is synthesized by the delegate tool's `execute` try/catch around `agent.generate` — never emitted by the sub-agent itself — and
logged via `serverRuntime.log.error`. The orchestrator narrates failures verbatim.

### Evidence on completed delegates

Domain sub-agents typically return a 1–2 sentence `summary`. Nested tool-call rows land in the transcript for later turns, but the
**current** orchestrator step only sees whatever `execute` returns. When the orchestrator must judge raw rows (a timeline, a log, a list),
that summary is lossy.

Every domain `delegateTo*` (not a fan-out whose result already carries `sources` / `items`) therefore takes optional
`detail: 'summary' | 'evidence'` (default `summary`):

- `summary` — `{ status, summary, items? }` as before. Mutations and simple lookups stay here.
- `evidence` — same envelope plus `evidence: [{ toolName, output }]` (last ≤12 tool outputs from the sub-agent `generate` steps, dropped
  from the oldest until the JSON is under ~32k chars; a single oversized leftover becomes `{ truncated: true, preview }`).
  `evidenceTruncated: true` when anything was dropped. Sentinels (`needsMoreInfo` / `noOp`) and `failed` never carry `evidence`.

Shared parse/attach lives in `collectSubAgentEvidence` / `attachDelegateEvidence` (`agentScaffolding.ts`). The field `.describe` on
`delegateDetailField()` teaches **when** to pick evidence; the orchestrator prompt teaches what to do when `evidence` is present (judge from
those outputs; do not re-delegate only to re-read).

### Scratch / blank-slate delegate

A fork may add a tool-less helper (`delegateToScratch` or equivalent) that is **not** a domain agent. The orchestrator supplies
`systemPrompt` (role, constraints, output shape) and `brief` (the work). The helper runs with no tools, no domain snapshot, and no chat
history — typically on the **orchestrator's per-turn model** so critique / rewrite / second-opinion work can use the stronger model.

Use it for brainstorming, critique, rewrite, second opinion, summarizing, or any isolated reasoning that should not inherit domain-agent
bias. Do **not** use it to re-analyze tool JSON — that is `detail: evidence` on the domain delegate. Persistence matches other delegates
(pre-write parent row, stamp `toolResult`); there are no nested child tool rows.

### Nested tool calls

The orchestrator's `delegateTo*` row lands as a normal `chatMessagesToolCall`, but the calls the sub-agent makes inside that delegation are
**also persisted** — each child row carries `parentChatMessageId = <delegate row id>`, and the transcript filters children out of the
top-level list and renders them indented under the parent. Collapsible nested steps: see
[`docs/styles/chat.md`](../styles/chat.md#nested-tool-steps) when that section applies.

Because the orchestrator's `onStepEnd` only fires after `execute` returns, the delegate tool **pre-writes** its own row (`toolResult: null`)
up front, runs the sub-agent, then stamps the final result — otherwise children's FKs would be invalid at insert time.

### Human-in-the-loop at the delegate boundary

Approval policy lives on the orchestrator `ToolLoopAgent` via AI SDK 7's `toolApproval` setting (not the deprecated per-tool
`needsApproval`). Manual mode (`assistantOptions.requireToolCallApprovals`) sets every `delegateTo*` (and other gated top-level tools) to
`'user-approval'`; Auto omits the map so they run immediately:

1. The AI SDK suspends before `execute` and emits a `tool-approval-request` for the brief.
2. Persistence writes the Approve / Decline card (no pre-write yet — `execute` has not run).
3. On approve, the next turn runs `execute`: pre-write → sub-agent → stamp result, as usual.
4. Nested sub-agent mutation tools stay ungated — one approval covers the whole brief.

See [chat.md — Human-in-the-loop approval](./chat.md).

### Missing tool results

The AI SDK rejects any conversation history where a `tool-call` has no matching `tool-result` (`AI_MissingToolResultsError`). Two gaps in
the nested-tool path used to leave chats permanently stuck on the next user message:

1. **`tool-error` ≠ `toolResults`.** When a tool's `execute` throws, the SDK puts a `tool-error` content part on the step — not a
   `tool-result`. Persistence must resolve outcomes from `toolResults` **or** a matching `tool-error` part, otherwise the row lands with
   `resultedAt: null`.
2. **Pre-written parent + thrown `execute`.** A `delegateTo*` tool pre-writes its row; if anything after that throw escapes the inner
   try/catch, the orchestrator's `onStepEnd` skipped the id via `preWrittenToolCallIds` and never stamped a result. A `tool-error` on a
   pre-written id must update that row to `{ status: 'failed', summary }` instead of leaving it open.

`chatMessageAiAdapter` also synthesizes a failed tool-result for any legacy / `resultedAt: null` row so already-broken chats can resume.

`tool-error` parts are surfaced in two places: the delegate tool's try/catch around `agent.generate` (primary — attaches `failed` to the
pre-written row), and `chatPersistStep` Phase A (logs any `tool-error` the orchestrator still sees, including non-delegating tools).

## Alternatives Considered

| Approach                                             | Why not                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| One agent, all the tools                             | Tool-selection accuracy and prompt bloat past ~10–15 tools                      |
| Per-route sub-agent with no orchestrator             | Cannot chain cross-domain turns in one message                                  |
| Top-level sibling agent factories per domain         | Client picks the agent; spoofable; duplicates persistence                       |
| Agent registry / generic dispatcher from day one     | Overkill until the third+ domain makes manual wiring painful                    |
| Always pipe raw sub-agent tool results upstream      | Burns tokens on every mutate/list; optional capped `detail: evidence` is enough |
| Run every domain sub-agent on the orchestrator model | Makes every domain hop expensive; keep a cheaper model for tool loops           |

## Consequences

- **One file per sub-agent; write tools colocated with their command.** Prefer `tool()` on the command file (`tool<Domain><Action>`).
  Read-only / external tools may stay as `src/server/agents/toolX.ts`.
- **Tools are thin wrappers around existing `commands/` + `queries/`.** The default input schema is the generated `GqlS<X>InputSchema()` /
  `GqlS<Enum>Schema` from `src/server/graphql/generated.ts` (`withDescriptions: true` so SDL field descriptions teach the model). See
  [api-layer.md](./api-layer.md#code-generation) and [Tool input schemas](#tool-input-schemas) below.
- **Prefer batch shapes** (`entitiesUpsert` accepting arrays) over N singular calls against a step budget. Matching mutations return
  `MutationResult { success, referenceIds }` so the sub-agent can chain parent ids without a follow-up read.
- <a id="tool-input-schemas"></a>**Exception: `DateTime` fields.** Generated Zod emits GraphQL `DateTime` as `z.date()`, which has no clean
  JSON-Schema representation under Gemini constrained decoding (`structuredOutputs: true`) and produces `MALFORMED_FUNCTION_CALL`.
  Hand-build those tool schemas with `z.string()` and convert via `new Date(...)` in `execute`. Reuse generated **enum** schemas in the
  hand-built shape. Keep a short header comment on each such tool pointing here.
- **Tool self-description is authoritative for selection.** A tool's `description` plus per-field `.describe(...)` are the only place that
  teaches _when to call_ it. System prompts never list tools. Narration / wire contracts (`completed` / `needsMoreInfo` / `noOp` / `failed`,
  and what to do with `evidence`) live once on the orchestrator prompt or in `subAgentClosingRules()` / `delegateDetailField()` — not
  copy-pasted onto every `delegateTo*`.
- **Sub-agent failure isolates to its turn** via `status: 'failed'` at the delegate layer. Catch inside `execute` **and** log `tool-error`
  parts in `chatPersistStep` Phase A.

## Where things live (pattern)

| Concern                                    | Location                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Shared provider / parse / evidence helpers | `src/server/agents/agentScaffolding.ts` (`delegateDetailField`, `collectSubAgentEvidence`, `attachDelegateEvidence`, sentinels) |
| Orchestrator                               | `src/server/agents/agent*.ts` registering `delegateTo*` tools                                                                   |
| Domain sub-agent                           | `src/server/agents/agent*<Domain>.ts`                                                                                           |
| Delegate tool                              | `src/server/agents/toolDelegateTo*.ts`                                                                                          |
| Write tools                                | Colocated on `src/server/commands/*.ts`                                                                                         |
| Nested transcript rendering                | `src/web/chat/chatTranscript.ts` + tool-call views                                                                              |
