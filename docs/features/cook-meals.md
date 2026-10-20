# Cook meals

Cooks maintain a personal meal library; operators can browse every cook’s meals in admin.

## Behavior

### Cook profile — `/profile/meals`

Signed-in cooks manage meals under the cook shell:

- **List** (`/profile/meals`) — active meals as `CookMealCard` (horizontal: thumb left; title, clamped description, outline draft/published
  badge; missing-image warning). Published meals without an image also show a warning **Not on public page** badge. A list banner calls out
  how many published meals lack a picture. Card click navigates to meal detail. Status tabs (All / Published / Draft) with counts; debounced
  search, sort, and **New meal** (creates a draft, toasts, navigates to edit). Filter state lives in the URL so refresh and back/forward
  keep the lens. Grid uses container queries (1 → 2 columns from ~42 rem) so sidebar collapse reflows like viewport width.
- **Detail** (`/profile/meals/$mealId`) — view-first: badge, title, description, image, usage sections. Missing image shows a warning
  `StatusAlert` (published: not on public page; draft: will not appear once published) with **Add picture**. Footer: **Edit** and
  **Publish** (draft only). Publish confirm warns when there is no image. **Unpublish** and **Delete** in an overflow menu. **Usage in
  menus** / **Usage in offers** lists every course that includes this meal; locked rows when this meal is the only option on a course. Menu
  rows link to menu detail; offer rows show customer + event time. Delete soft-deletes when allowed; blocked usage opens an error dialog and
  the server refuses delete.
- **Edit** — TanStack Form for title, description, image; Save/Cancel. Image uses shared `CookMealImageField` (crop dialog 1:1; remove
  confirms first; empty state and remove confirm mention public-page visibility). Save returns to detail. The same editor dialog + image
  field open from menu edit (course rows, meal picker create/edit, missing-image Add picture) so cooks can change meals without leaving a
  dirty menu form. Library meals are shared: edits apply everywhere the meal is used.

Soft-deleted meals 404 on cook detail. Non-cooks see access denied.

**Publish status on meals** is inventory organization only when `PUBLICATION_MEALS` is on. With that toggle off, cook list/detail hide
draft/published badges and publish/unpublish actions (admin still sees them). Menu edit / meal multi-picker and booking-offer meal pickers
do not filter or badge by publish status. Public cook-page meal catalog still requires `publishedAt` **and** an image when productized.

### Public cook page

Only published, non-deleted meals **with an image** appear. They use `CustomerMealCard` with `variant="marketing"` (square image on top;
title and up to two lines of description with ellipsis). Click opens the same read-only meal details dialog as the horizontal consume card
(large image, title, description). No select action and no cook edit surfaces. Published meals without an image stay in the cook library but
are omitted from the public catalog (and from the cook listing gate that requires ≥1 catalog-eligible meal).

### Admin — `/admin/meals`

Operators browse all cooks’ meals (including soft-deleted) with `CookMealCard`, pinned bottom pagination (`page` / `pageSize`; default 25),
and a shared single-row inventory toolbar (URL-backed):

- Search matches title, description, cook name, or cook email
- Status Select: All / Published / Draft / Deleted
- Sort: newest / oldest / title / recently published / recently deleted
- Cook Combobox filter
- Image Select: All / With image / Without image / On public page / Not on public page
- Compact 1 → 2 column card grid (`CookMealCard` density compact; left image is a square sized to the card content height)

Card click navigates to meal detail. Deleted cards show a destructive deleted badge; prior publish state appears as muted meta. Cook name
links to that user’s meals tab.

- **Detail** (`/admin/meals/$mealId`) — view-first (badge, cook link, title, description, image, usage sections). Soft-deleted rows are
  view-only. Active rows: **Edit**, **Publish** (draft), overflow **Unpublish** / **Delete** (same sole-option delete gate as cook). Admin
  always shows publish controls (independent of `PUBLICATION_MEALS`).
- **Edit** (`/admin/meals/$mealId/edit`) — TanStack Form for title, description, image (`CookMealImageField`). Image uploads are owned by
  the admin session and reassigned to the cook on save. Save / Cancel return to detail. Soft-deleted meals 404 on edit.

### Admin user detail — meals tab

Cook membership shows the same `CookMealCard`s (including deleted) plus created date. Card click opens admin meal detail. **Create meal**
mints a draft and navigates to admin meal edit.

## Decisions

### Alternatives considered

| Option                                    | Pros                                | Cons                                         |
| ----------------------------------------- | ----------------------------------- | -------------------------------------------- |
| Hard delete like partners                 | Matches content pages               | Loses inventory cooks regret deleting        |
| Soft-delete + hide from cook API (chosen) | Recoverable for ops; simple cook UX | Requires deleted-at convention               |
| Full upsert like partners                 | One mutation                        | Awkward for field-by-field cook forms        |
| Partial meal update (chosen)              | Matches user update pattern         | Must require at least one field              |
| UI-only delete gate                       | Simpler command                     | Soft-delete could empty a course via hydrate |
| UI + server delete gate (chosen)          | Keeps courses non-empty             | Extra relationship check on delete           |

### Chosen

Meals with draft/publish timestamps and soft delete. Cook-facing APIs hide deleted rows; admin exposes deletion. Creates start as drafts
with a placeholder title; updates are partial patches with title capitalization. Usage and delete blocking: a course blocks delete when this
meal is its only active option.

## Implementation

- Schema: `Meals` in `src/server/db/schema.ts`
- SDL: `CookMeal`, relationships, `CookMutation`, `AdminCookMeal` (`imageFileUploadId`, `relationships`), `AdminCookMealCriterion`
  (`status`, `imageFilter`, broader `searchText`, optional `mealIds` for primary-key drill-in) in `schema.graphqls`
- Commands: `cookMealCreate`, `cookMealUpdate`, `cookMealDelete` (soft; refuses when relationships block); admin `cookMealCreate` /
  `cookMealUpdate` / `cookMealDelete` (image uploads owned by admin then reassigned to cook)
- Queries: cook find many/one (active only); `Cook.mealsCounts(criteria: [CookMealCriterion!]!)` (soft-deleted never counted; optional
  `searchText`); admin find many/counts/findOne (includes soft-deleted); public catalog via `publicCookMealFindMany` (published + image)
- Utils: `cookMealRelationshipsFind` — shared by field resolver and delete; `cookMealCriterionWhere` for cook counts;
  `publicCookMealCatalogWhere` — shared published + non-deleted + image gate for public meal list and cook listing
- Mappers: `toGqlCookMeal`, `toGqlAdminCookMeal`
- Guard: `guardCookMutation`
- File GET: published non-deleted meal images public; admins read any — [file-storage.md](../architecture/file-storage.md)
- UI: `CookMealCard` (cook/admin manage; missing-image popover + published-without-image status badge; optional Add picture),
  `CustomerMealCard` (horizontal consume on offers/checkout; `variant="marketing"` on public cook page), shared `MealDetailsDialog`,
  `CookMealImageField`, `CookMealEditorDialog` (menu-edit create/edit; injectable `saveHandlers` for admin); profile list/detail/edit
  (list + detail + public-preview `StatusAlert`s for missing images), `SectionCookMeals`, `AdminMealsPage` / `AdminMealPage` /
  `AdminMealEditPage` + shared `AdminCookInventoryListToolbar` / `adminCookInventoryListSearch`, user-detail meals tab
- Routes: `profile/meals`, `profile/meals_.$mealId`, edit route, `admin/meals`, `admin/meals_.$mealId`, edit route, public chef page meals
  section
- Live state: `useUserUpdatesSeed` + `userUpdates` after cook meal commands; admin detail/edit via `adminUpdates` —
  [state-synchronization.md](../architecture/state-synchronization.md)

See [cook-shell.md](./cook-shell.md), [cook-menus.md](./cook-menus.md), [admin-users.md](./admin-users.md).
