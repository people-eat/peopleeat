# AI generations (one-shot)

## Context

Chat multi-turn LLM usage is already denormalized onto AI-produced message variant rows (`modelId` + token columns). Separate one-shot
`generateText` calls (menu suggestions, chat titles, call transcripts, …) had no durable ledger — only the provider dashboard.

## Decision

**PostgreSQL `AiGenerations` table** written fire-and-forget via `ServerRuntime.aiGenerations.record()`, exposed to admins as overview /
list / detail under `/admin/ai-generations`.

Scope is **one-shot only**. Chat turn generations stay on message variants; do not unify in v1.

Live LLM/agent trees (nested tools, latency, Langfuse sessions) are OpenTelemetry traces — see [observability.md](./observability.md).
`AiGenerations` remains the durable admin ledger for one-shot prompt/output audit.

## Alternatives considered

| Option                            | Why rejected                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Provider dashboard only           | No prompt/output audit; no per-kind / per-user product filters               |
| Reuse `Logs`                      | Wrong shape (severity vs full prompt ledger); mixes errors with generations  |
| Unified table for chat + one-shot | Forces joins on the chat UI badge path; chat already has row-local usage     |
| Truncate / omit prompts           | Rejected for v1 — admins need full system / prompt / output to inspect drift |

## Consequences

- Every successful one-shot call stores full `system`, `prompt`, and `output` (structured outputs as JSON text).
- **Multimodal exception:** binary file parts (call-recording audio) are not dumped into Postgres. The prompt column stores text parts plus
  a placeholder like `[file mediaType=audio/ogg byteLength=…]`.
- Inserts never fail the caller (same stance as `ServerRuntime.log`).
- Token columns match chat generation meta (`inputTokens`, `outputTokens`, `totalTokens`, `reasoningTokens`, `cachedInputTokens`) via shared
  `aiGenerationUsageFromLanguageModel`.
- Table grows with AI usage — add a retention policy when volume warrants.

## How it works

### Database

| Column                         | Type                        | Notes                                                     |
| ------------------------------ | --------------------------- | --------------------------------------------------------- |
| `aiGenerationId`               | uuid PK                     |                                                           |
| `kind`                         | varchar                     | `AiGenerationKind` in `src/server/domain/aiGeneration.ts` |
| `userId`                       | uuid nullable FK → Users    | set when known                                            |
| `sessionId`                    | uuid nullable FK → Sessions | cook mutations with a requesting session                  |
| `modelId`                      | varchar nullable            | from `result.response.modelId`                            |
| `system` / `prompt` / `output` | text                        | full text                                                 |
| `*Tokens`                      | integer nullable            | same six as chat                                          |
| `createdAt`                    | timestamptz                 | default now                                               |

Kinds today:

- `COOK_MENU_SUGGESTION_FROM_TEXT` → `ai.cookMenuSuggestionModel`
- `COOK_MENU_SUGGESTION_FROM_INVENTORY` → `ai.cookMenuSuggestionFromInventoryModel`
- `COOK_MENU_TITLE_DESCRIPTION` → `ai.cookMenuTitleDescriptionModel`
- `CHAT_TITLE` → `ai.chatTitlerModel`
- `BOOKING_REQUEST_OFFER_CALL_RECORDING_TRANSCRIPT` → `ai.bookingRequestOfferCallRecordingTranscriptModel`
- `BOOKING_REQUEST_OFFER_CALL_RECORDING_SUMMARY` → `ai.bookingRequestOfferCallRecordingSummaryModel`
- `COOK_BIOGRAPHY_SUGGESTION` → `ai.cookBiographySuggestModel`
- `COOK_BIOGRAPHY_SUMMARY` → `ai.cookBiographySummaryModel`
- `BOOKING_REQUEST_COOK_MENU_EVALUATION` → `ai.cookMenuEvaluationModel`

Add a kind when a new one-shot use case ships (GraphQL enum + domain union + dedicated `ServerRuntime.ai` factory). Never reuse
`*AssistantModel` slots for one-shots — those are chat-agent only.

### Writer

`aiGenerationsCreate(db)` on `ServerRuntime.aiGenerations`. Callers record after a successful `generateText`:

```ts
serverRuntime.aiGenerations.record({
  kind: 'COOK_MENU_TITLE_DESCRIPTION',
  userId: cookId,
  sessionId: requestingSession.sessionId,
  system,
  prompt,
  output: aiGenerationOutputSerialize(result.output),
  ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
});
```

Failed LLM calls are not recorded in v1 (errors already go through `serverRuntime.log`).

### Admin GraphQL / UI

See [features/admin-ai-generations.md](../features/admin-ai-generations.md).

### Key files

- `src/server/db/schema.ts` — `aiGenerations` table
- `src/server/domain/aiGeneration.ts` — kind union
- `src/server/utils/aiGenerationsCreate.ts` — fire-and-forget writer
- `src/server/utils/aiGenerationUsage.ts` — shared token normalization
- `src/server/utils/aiGenerationOutputSerialize.ts` — string / JSON output
- Call sites: `cookMenuSuggestionFromText`, `cookMenuSuggestionFromInventoryGenerate`, `cookMenuTitleDescriptionSuggest`,
  `chatTitleGenerate`, `bookingRequestOfferCallRecordingFinalize` (transcript + summary), `bookingRequestOfferCallRecordingSummaryGenerate`,
  `cookBiographySuggestGenerate`, `cookBiographySummaryGenerate` (also from the `cook-biography-summary-generate` job after cook biography
  save; admin summary suggest still calls the command inline), `cookBookingRequestMenuEvaluationGenerate` (from the
  `cook-booking-request-menu-evaluation-generate` job; runs in parallel with inventory suggestion — see
  [ai-menu-evaluation.md](../features/ai-menu-evaluation.md))
