# Cook menus

Cooks build reusable menus (courses + meal options); operators browse all menus in admin; offer flows deep-copy inventory menus onto offers.

## Behavior

### Cook profile — `/profile/menus`

Signed-in cooks manage menus under the cook shell:

- **List** (`/profile/menus`) — scope tabs **Library** (Vorlagen) | **In offers** (In Angeboten) with counts. Library is inventory
  templates; In offers lists per-offer deep copies with customer name + booking date on each card and an **Open offer** link. Library keeps
  search, sort, **New menu** (draft with three default empty courses → edit), and when `PUBLICATION_MENUS` is on a publication **Select**
  (All / Published / Draft) instead of nested status tabs. In offers keeps search/sort only and shows short copy that templates and offer
  copies do not auto-sync. URL-backed: `scope=offers`, `status`, `q`, `sort`. Same container-query card grid as meals (meal-image collage
  from `courseMealOptionImages`, or book icon when empty).
- **Detail** (`/profile/menus/$menuId`) — view-first course summary (no course borders; `text-base` titles) with `CookMealCard` per meal
  option (click → read-only details dialog). Copy explains guest choice per course; multi-select courses show **Up to N dishes selectable**,
  single-select with several options shows **1 dish selectable**.
  - **Library menus** — Footer: **Edit**, **Publish** (draft only; every course needs ≥ 1 meal). Overflow: **Copy**, **Unpublish**,
    **Delete**. Copy deep-copies to a new draft and opens detail.
  - **Offer menus** — Badge + info that this is a per-offer copy. Footer **Edit** only while the offer is negotiable (`USER_NEEDS_TO_ACCEPT`
    / `COOK_NEEDS_TO_ACCEPT`). Overflow: **Open offer**, **Sync to template** (confirm lists title / description / course diffs vs the
    linked library template, then overwrites those fields; navigates to the template). No publish / copy / delete on offer copies.
- **Edit** — TanStack Form for title, description, courses via collapsible course editor (incomplete courses warned; reorder/delete with
  confirms; on desktop (`md+`) vertical-only drag handles reorder courses and meal options within a course with live sibling shifts and a
  full-height dashed drop slot via `@dnd-kit` + `DragOverlay`; on smaller viewports up/down buttons remain and FLIP-animate via
  `animateListReorder`; course titles from a Select of presets; meal options as `CookMealCard` with reorder/remove actions (remove is red
  and confirms; no draft/published badge; publish status is inventory organization only); meal multi-picker uses the same cards with
  Select/Selected + selected fill; card click opens read-only details, not toggle; optional limit; create/edit meals (title, description,
  image) in a shared dialog without leaving the menu form; course rows have Edit and missing-image Add picture). Save / Cancel return to
  detail, or to a safe `returnTo` path when opened from offer create / edit-menus (`router.clearCache` for those routes first so the offer
  page reseeds after missing the in-flight `userUpdates` push; those destinations use blocking stale reload). Offer-scoped edit redirects to
  detail when the offer is no longer negotiable.

Soft-deleted menus 404 on cook detail. Soft-deleted meals omitted from course options.

### Admin — `/admin/menus`

Inventory menus for all cooks (including deleted; offer copies excluded). Same shared single-row inventory toolbar as admin meals (search
title / description / cook, status, sort, cook filter; no page title — breadcrumbs only), pinned bottom pagination (`page` / `pageSize`;
default 25), and a compact equal-height 1 → 2 column card grid (`CookMenuCard` density compact; left meal-image collage is a measured square
matching card height, same ResizeObserver approach as `CookMealCard`). Card click navigates to menu detail. Cook name → user menus tab.

- **Detail** (`/admin/menus/$menuId`) — view-first course summary with `CookMealCard` per option (click → admin meal detail). Soft-deleted
  rows are view-only. Active inventory rows: **Edit**, **Publish** (draft; every course needs ≥ 1 meal), overflow **Copy** / **Unpublish** /
  **Delete**. Admin always shows publish controls (independent of `PUBLICATION_MENUS`). Offer-scoped copies (deep-linked from admin offer
  pages): info badge, **Edit**, optional **Open template**; no publish / copy / delete / sync-to-template.
- **Edit** (`/admin/menus/$menuId/edit`) — TanStack Form for title, description, courses via `CookMenuCoursesEditor` (inline meal
  create/edit uses admin `cookMealCreate` / `cookMealUpdate` via injectable `saveHandlers`). Works for inventory and offer-scoped copies.
  Soft-deleted menus 404 on edit.

### Admin user detail — menus tab

Menu cards for that cook; card click opens admin menu detail. **Create menu** mints a draft and navigates to admin menu edit.

### Offer menus

When a cook creates or updates an offer, inventory menus are deep-copied onto the offer; offer-scoped copies are separate from the meal/menu
library. From offer create / edit-menus, **New menu** mints a draft (same as the menus list) and opens menu edit with a safe `returnTo` back
to the offer flow; **Edit** on any picker card opens the same menu edit + `returnTo` loop (incomplete menus are added to draft `menus` so
they stay selected when complete; already-selected complete menus keep their selection). Draft selection / price / message live in
offer-create URL search. Meal AI in the course editor can still insert draft meals — see [booking-offers.md](./booking-offers.md) and
[ai-generations.md](../architecture/ai-generations.md).

Cooks can also find those copies under `/profile/menus?scope=offers`, edit them in place while negotiable, or **Sync to template** to push
customizations back onto the library source (`copyOfMenuId`).

**Publish status on inventory menus** does not gate offer pickers (all non-deleted menus listed). When `PUBLICATION_MENUS` is off, cook
list/detail hide draft/published badges and publish/unpublish actions (admin still sees them). Draft/publish still drives public cook-page
catalog when that surface is productized. **Completeness** does: menus where any course lacks meal options show an Incomplete badge in offer
create / edit-menus pickers and cannot be selected until finished via **Edit**. Pickers (`CookMenuSelectPanel`) use two container-query
grids of base `Card`s (1 → 2 from `@xl` → 3 from `@2xl` → 4 from `@3xl`) with the same meal-image collage as `CookMenuCard`
(`courseMealOptionImages`, or book icon when empty), secondary **Edit** / **Fertigstellen** (Finish) plus outline Select / Selected on
complete cards (full-width below `@md`, end-aligned from `@md`): selectable menus first, incomplete menus in a dedicated section below.

## Decisions

### Alternatives considered

| Option                                    | Pros                                | Cons                               |
| ----------------------------------------- | ----------------------------------- | ---------------------------------- |
| Hard delete                               | Simple                              | Loses regretted inventory          |
| Soft-delete + hide from cook API (chosen) | Matches meals; recoverable in admin | Inventory convention               |
| Visibility boolean only                   | Simpler schema                      | No draft/publish UX                |
| `publishedAt` draft/publish (chosen)      | Same lens as meals                  | Slightly more UI                   |
| Sync AI menu suggestions (chosen)         | Fast drafting                       | LLM cost; may insert draft meals   |
| Streaming generation UI                   | Progressive chunks                  | No streaming pattern for menus yet |
| Nested publish tabs under scope           | Familiar status tabs                | Two tab bars; replaced by Select   |

### Chosen

Menus with courses and meal options; draft/publish and soft delete aligned with meals. Creates insert a draft with three named empty courses
whose titles (and the draft menu title) follow the cook’s `Users.locale` (`Vorspeise` / `Starter`, …). Course tree updates are full replace
on save. AI suggestions return a full suggestion object synchronously (no streaming generation id).

Library vs offer scope is first-class on the cook menus list (scope tabs + publication Select). Offer copies stay separate rows; cooks can
edit them while negotiable and optionally sync content back to the inventory template.

Historical fields such as menu `preparationTime` or `greetingFromKitchen` are not modeled (accepted product loss). Cooks set timing and
kitchen notes in description or offer chat instead.

Desktop course/meal reorder uses `@dnd-kit` (not a custom pointer layer) so siblings can live-shift and the active slot can keep the dragged
item’s full height while a `DragOverlay` follows the pointer on the vertical axis only. Button up/down stays for touch / narrow viewports.

## Implementation

- Schema: `Menus`, `MenuCourses`, `MenuCourseMealOptions`; nullable offer link + copy-of for offer-scoped rows
- `Cook.menus` stays inventory-only (`bookingRequestOfferId` null) for offer pickers; `Cook.offerMenus` lists offer-scoped copies with
  `CookMenuOfferContext` (offer id, booking date/time, customer first name, offer status); `CookMenu.templateMenu` resolves the living
  inventory source for sync preview
- `Cook.menu(menuId)` returns library or offer-scoped rows; soft-deleted still hidden
- SDL: `CookMenu` (+ `bookingRequestOfferId`, `offerContext`), `PublicCookMenu`, `AdminCookMenu` (+ `courses` as `AdminCookMenuCourse` with
  nested `AdminCookMeal`; each exposes `courseMealOptionImages: [String!]!` — meal-option photo URLs in course/option order, deduped),
  `AdminCookMenuCriterion` / shared `AdminCookInventoryStatus`, courses, suggestion types
- Commands: create (locale-aware draft title + default course titles via `cookMenuDraftDefaults` from cook `Users.locale`), update (offer
  rows: no `publishedAt`; editable only while negotiable), delete (soft, inventory-only), copy (inventory source), `menuSyncToTemplate`
  (offer → living inventory `copyOfMenuId`), `menuSuggestionFromText`, `menuTitleDescriptionSuggest` (menu-level AI suggestion mutations
  remain; cook UI surface removed with inline create form — meal AI in the course editor still ships); admin `cookMenuCreate` /
  `cookMenuUpdate` (inventory + offer copies; `publishedAt` inventory-only) / `cookMenuDelete` / `cookMenuCopy` (inventory only)
- Queries: `cookMenuFindMany`, `cookOfferMenuFindMany`, find-one with course hydrate (derives `courseMealOptionImages` from hydrated meals);
  `Cook.menusCounts(criteria: [CookMenuCriterion!]!)` (soft-deleted never counted; optional `searchText`); admin find/counts (inventory
  only) and findOne (inventory + offer-scoped for deep-links; hydrates courses; exposes `bookingRequestOfferId` / `copyOfMenuId`)
- Guard: `guardCookMutation` + legal acceptance
- UI: `CookMenuCard` / exported `CookMenuCardMedia` (collage from `courseMealOptionImages`; card shell measures height and sizes the collage
  as a square via ResizeObserver — avoids CSS `aspect-square` + `self-stretch` flex blow-up; admin click → `MenuDetailsDialog`),
  `CookMenuCoursesEditor` (uses `CookMealCard` + `CookMealEditorDialog` for inline meal create/edit with `CookMealImageField`; desktop
  vertical sortable via `@dnd-kit/sortable` + `restrictToVerticalAxis`; mobile/button reorder FLIP via `animateListReorder` +
  `data-reorder-id`), `CookMenuSelectPanel` on offer create / edit-menus (reuses `CookMenuCardMedia`) —
  [booking-offers.md](./booking-offers.md); `AdminMenusPage` / `AdminMenuPage` / `AdminMenuEditPage` share inventory toolbar patterns with
  admin meals
- Routes: profile menus, admin menus + `$menuId` + edit, pool offer-create route
- Live state: `useUserUpdatesSeed` + subscription after cook menu commands (including AI draft meals); admin detail/edit via `adminUpdates`

See [cook-meals.md](./cook-meals.md), [cook-shell.md](./cook-shell.md), [admin-users.md](./admin-users.md).
