# AI menu evaluation

When a cook opens a booking-request pool item, the platform can score their inventory menus against the request and suggest a new menu
assembled from their meals. Recommendations only: the cook still chooses freely.

## Behavior

1. On first open of a pool request (`bookingRequestOpen`), if `AI_MENU_EVALUATION` is enabled and no evaluation exists yet, the server sets
   `menuEvaluationLoading` and enqueues a background job.
2. The job runs **two LLM calls in parallel**:
   - Rank existing inventory menus (`isSuitable` + short summaries + banner summary).
   - Generate a request-specific menu draft from the cook’s meal inventory (not inserted until the cook opts in).
3. Offer create (`/profile/booking-request-pool/$bookingRequestId/create`) shows:
   - Info banner with the evaluation summary
   - Skeleton while loading (recommendation slot); menus stay selectable without badges until done
   - Suitability badges (Passend / Weniger passend) in the card footer (bottom left, same row as Edit / Select) with hover / pressed
     affordance; per-menu reasons open in a popover so cards stay scannable
   - Incomplete menus collapsed by default (expand to finish)
   - Platform recommendation card with **Use recommendation** (creates a draft inventory menu and selects it; clears `generatedMenu` and the
     banner summary; stamps the new menu as suitable so the Passend badge shows immediately)
   - **Refresh recommendations** (manual only — menu create/edit does not auto-re-evaluate)
4. Inventory menu generation is also available as a sync cook mutation (`menuSuggestionFromInventory`) for menu-create reuse, with its own
   admin AI-generations kind.

## Decisions

| Decision                                | Why                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Async job + DB `menuEvaluationLoading`  | Open must not block on the LLM; SSE via `userUpdates` refreshes the UI        |
| Parallel ranking + inventory generation | Faster time-to-recommendation; separate AiGenerations kinds for admin filters |
| Store `generatedMenu` as draft JSON     | Avoid silent meal inserts before the cook opts in                             |
| Lazy refresh only                       | Avoid surprise re-runs and cost when the cook edits menus mid-flow            |
| Feature toggle `AI_MENU_EVALUATION`     | Ops can disable without a deploy                                              |

## Next steps / Ideas

- Wire `menuSuggestionFromInventory` into the cook menu create / edit UI.
- Optional ranking scores (numeric) if boolean + copy is not enough for sorting.

## Implementation

### Persistence

`BookingRequestCooks.menuEvaluation` JSONB (`BookingRequestCookMenuEvaluation`) + `menuEvaluationLoading`.

### GraphQL

- `BookingRequestCookPoolDetails.menuEvaluation` / `menuEvaluationLoading`
- `CookMutation.bookingRequestMenuEvaluationRefresh`
- `CookMutation.bookingRequestGeneratedMenuApply`
- `CookMutation.menuSuggestionFromInventory(brief: String)`

### Jobs / commands

| Piece                   | Path                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| Schedule                | `src/server/utils/cookBookingRequestMenuEvaluationSchedule.ts`         |
| Job                     | `src/server/jobs/handlers/cookBookingRequestMenuEvaluationGenerate.ts` |
| Ranking generate        | `src/server/commands/cookBookingRequestMenuEvaluationGenerate.ts`      |
| Inventory generate      | `src/server/commands/cookMenuSuggestionFromInventoryGenerate.ts`       |
| Inventory sync mutation | `src/server/commands/cookMenuSuggestionFromInventory.ts`               |
| Apply generated         | `src/server/commands/cookBookingRequestGeneratedMenuApply.ts`          |
| Open trigger            | `src/server/commands/cookBookingRequestOpen.ts`                        |

### AiGenerations kinds

- `BOOKING_REQUEST_COOK_MENU_EVALUATION`
- `COOK_MENU_SUGGESTION_FROM_INVENTORY`

### UI

`CookMenuSelectPanel` + `ProfileCookBookingRequestOfferCreatePage` (gated by session `AI_MENU_EVALUATION`).
