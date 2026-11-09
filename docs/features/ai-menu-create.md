# AI menu create

Cooks can create a library menu from text or a file. The platform matches dishes they already have, proposes new drafts only for gaps, and
saves nothing until the cook confirms.

## Behavior

When `AI_MENU_CREATE` is on, **New menu** on `/profile/menus` (library) and on offer create / edit-menus opens a chooser instead of minting
an empty draft:

- **From text or a file** (first) — stays in the same dialog. Cooks paste a menu, describe an occasion, or attach a PDF, photo of a printed
  or handwritten menu, `.txt`, or Word `.docx` (up to 5 files). Suggest needs text or at least one file. Nothing is saved until they confirm
  on review.
- **Start from scratch** — today’s path: a title plus three empty courses, then edit.

The text step is a large text area (label **Menu or occasion**) plus a dashed drop zone (caption, **Add file**, attached files). On desktop
the zone also says to drag files here. At 5 files the caption reads **5 of 5 files**. Backdrop click does not close during generating or
review (X and Esc still do). A suggestion that finishes after close is ignored.

While generating, a status bar stays pinned above the form (file vs text, then matching dishes, then assembling courses, then the last line)
so it stays visible on small screens and when the brief is long. Failures keep the cook’s input and clear when text or files change. Never a
raw error.

Review shows an editable title, then courses, then description, plus a reuse summary (`3 aus deinen Gerichten, 2 neue Entwürfe`). Existing
meals use the real photo and title. New meals use the soup placeholder and an outline **Neu** / **New** badge (no missing-image chip). Cooks
can remove a dish (toast with **Undo**) before save. If any new meal has no photo, one info note explains offers are fine and the public
cook page needs photos later. **Edit details** goes back. Library save is **Create menu**; offer save is **Create and select**.

**Create menu** / **Create and select** inserts new draft meals and one inventory menu in one step, then:

| Surface                   | After create                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/profile/menus`          | Toast “Menü angelegt.”, close dialog, open **menu detail**                                                   |
| Offer create / edit-menus | Toast “Menü angelegt und ausgewählt.”, close dialog, **select and stay**, scroll the selected card into view |

Chooser is hidden when the toggle is off; **New menu** stays the empty mint. Admin **Create menu** on the user tab stays a blank mint. Pool
**Use recommendation** stays: that path is request-specific and already reviewed as a card.

New meals and menus from this flow (and from **Use recommendation**) keep a `generatedAt` stamp. Cook and admin cards show a **Generiert** /
**Generated** outline badge. Customers never see it. Admin meal/menu detail also shows the timestamp. Later edits do not clear the stamp.

## Decisions

| Decision                                     | Why                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Review before insert                         | Cooks see reuse vs new dishes; nothing hits the library until they say yes                   |
| One from-text pipeline, files as extra input | Matching work already existed; PDF/images go to Gemini, txt/docx become prompt text          |
| Feature toggle `AI_MENU_CREATE`              | Ops can disable without a deploy                                                             |
| Cook-only generated badge                    | Origin marking for cooks and ops; customer-facing “AI” labels would undercut trust on offers |
| Keep pool Use recommendation                 | Request-specific evaluation is already reviewed as a card                                    |

### Alternatives considered

Streaming tokens, an async job, embedding search, and auto-cropping dish photos from a menu scan were deferred. Sync `generateText` matches
today’s suggestion mutations; the UI generating step can later sit on a job if large PDFs time out GraphQL.

## Next steps

Promote to an async job if PDFs time out the GraphQL mutation. The generating step can stay.

## Ideas

- Swap-picker on review (v1: remove a dish, then edit after create)
- Embedding search beyond the LLM id match
- Auto-crop dish photos out of a menu scan

## Implementation

### Persistence

Nullable `generatedAt` on `Meals` and `Menus`. Set on insert for new meals from apply and for menus from apply or evaluation **Use
recommendation**. Reused meals are never stamped. The stamp is origin, not “untouched”.

### GraphQL

- `CookMeal.generatedAt` / `CookMenu.generatedAt` / `AdminCookMeal.generatedAt` / `AdminCookMenu.generatedAt`
- `CookMutation.menuSuggestionFromText(text, fileUploadIds)` → `CookMenuSuggestionDraft` (no inserts)
- `CookMutation.menuSuggestionApply(suggestion)` → `MutationResult` (`referenceId` = menu id)
- Both gated by `AI_MENU_CREATE` for the cook `userId`. `guardCookMutation` + legal acceptance.

### Files

`POST /api/file-uploads` allowlist includes `text/plain` and Word
(`application/vnd.openxmlformats-officedocument.wordprocessingml.document`). Cap remains 10 MB. Owner must be the cook. PDF/images are
Gemini file parts; txt/docx are extracted into the prompt (`mammoth` for docx).

### Commands

| Piece              | Path                                                          |
| ------------------ | ------------------------------------------------------------- |
| From text / files  | `src/server/commands/cookMenuSuggestionFromText.ts`           |
| Apply              | `src/server/commands/cookMenuSuggestionApply.ts`              |
| File load          | `src/server/utils/cookMenuSuggestionFileContentsLoad.ts`      |
| Materialize drafts | `src/server/utils/cookMenuSuggestionDraftMaterialize.ts`      |
| Menu insert        | `src/server/utils/cookMenuSuggestionMenuInsert.ts`            |
| Evaluation apply   | `src/server/commands/cookBookingRequestGeneratedMenuApply.ts` |

AiGenerations kind stays `COOK_MENU_SUGGESTION_FROM_TEXT`. Prompt column stores text plus `[file mediaType=… byteLength=…]` placeholders.

### UI

`CookMenuCreateDialog` (chooser, text/files, generating, review). `context` is `library` (default) or `offer` for the review save label.
Callers: `ProfileCookMenusPage`, `CookMenuSelectPanel` (offer create / edit-menus). Feature toggle via
`useFeatureToggleActive('AI_MENU_CREATE')`. Cook-only generated badge on `CookMealCard` / `CookMenuCard`. Review cards use
`density="compact"` and `showStatusBadge={false}` (hides draft/published and the missing-image chip).

See [cook-menus.md](./cook-menus.md), [cook-meals.md](./cook-meals.md), [booking-offers.md](./booking-offers.md),
[ai-menu-evaluation.md](./ai-menu-evaluation.md), [ai-generations.md](../architecture/ai-generations.md).
