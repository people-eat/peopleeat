# Content sections

## Context

Cities, partners, occasions, and blog posts are admin-editable SEO surfaces that share the same free-form body model: an ordered list of
typed blocks (content, image, quote, list, CTA, Q&A). peopleeat keeps **one** shared section domain and four thin entity tables — not a
separate section stack per entity.

## Decision

1. **Canonical type** — `ContentSection` in [`src/shared/contentSection.ts`](../../src/shared/contentSection.ts), validated with Zod on
   write (`contentSectionsSchema`). Paired `*De` / `*En` fields; empty EN falls back to DE at render (`contentLocaleText` /
   `contentLocaleItems`).
2. **Persistence** — jsonb `sections` column on `Cities`, `Partners`, `Occasions`, and `BlogPosts`.
3. **GraphQL** — one `ContentSection` union; mappers stamp `gqlTypeName` (see [`extensions.ts`](../../src/server/graphql/extensions.ts));
   `__resolveType` returns `obj.gqlTypeName`. Write path uses flat `ContentSectionInput` + Zod narrowing.
4. **UI** — [`ContentSectionsEditor`](../../src/web/components/ContentSectionsEditor.tsx) (admin) and
   [`ContentSectionsRenderer`](../../src/web/components/ContentSectionsRenderer.tsx) (public + preview). Section up/down in the editor
   FLIP-animates via [`animateListReorder`](../../src/web/utils/animateListReorder.ts) (`data-reorder-id` on each section `Card`). Prose is
   markdown via `MarkdownBody` (Streamdown with `linkSafety` off — see [conventions.md](../conventions.md#client-bundle--code-splitting) and
   [chat.md](../styles/chat.md#internal-vs-external-links)). Live preview wraps chrome in
   [`ContentPageView`](../../src/web/components/ContentPageView.tsx), which owns `@container` so Header / Footer / `SectionHero` / section
   layout tracks the preview pane width rather than the admin viewport (Footer `@4xl:`; HeaderNav `@6xl:`; sections / hero `@md:` / `@lg:`).
   Full pages fall back to `body`’s `@container`. Public content bands (including
   [`ContentSectionsRenderer`](../../src/web/components/ContentSectionsRenderer.tsx) and
   [`SectionBlogHero`](../../src/web/sections/SectionBlogHero.tsx)) share `max-w-7xl` with `px-4 @lg:px-6` and container-query breakpoints
   only — never viewport `sm:` / `md:` / `lg:` — so admin split preview and full pages reflow the same way. Blog posts pass
   `heroVariant: 'article'` so public detail and admin preview render `SectionBlogHero` (title → lead → rounded image) instead of full-bleed
   `SectionHero`; the editor still exposes the Hero card (lead uses a textarea labeled Einleitung / Lead). Admin detail editors use
   [`Tabs`](../../src/web/components/base/tabs.tsx) with `TabsList variant="line"` (**Edit** / **Preview**) with the active tab in the
   `?tab=` search param (`edit` default when omitted; `preview` for the full chrome preview). **Edit** is form controls + sticky live
   preview on `lg+` (mobile uses the Preview tab for full chrome). The preview column stretches with the form so `sticky` keeps the pane
   pinned; a `max-h` inner scrollport holds the full-height (`h-dvh`) hero. `useContentPageEditorPreviewSync` scrolls that pane to the
   `data-content-preview-anchor` matching the form block in view (`data-content-editor-anchor`). Hero image upload uses a button +
   programmatic file-input click (not a `<label>` wrapper) so focusing an `sr-only` input cannot jump the admin workspace scroller. Form
   fields (DE/EN field locale; cards in page order: SEO → optional `identityFields` → Hero → optional `extraFields` → configurable sections;
   each section item its own sibling `Card`) and primary publish / save actions (with secondary actions in an overflow menu) render only on
   **Edit**, in a row under the tabs (not in the tab trailing slot). `identityFields` hold entity identity (partner/occasion/city name);
   `extraFields` hold page-body extras after the hero (partner / occasion first section / promo, occasion formats showcase, featured cooks,
   testimonials) so the editor matches public stack order. Occasion `formatsSection` is entity-owned typed jsonb chrome (exactly three
   cards), not a free-form `ContentSection` kind — see [`occasions.md`](../features/occasions.md). Preview passes an explicit `locale` (+
   `onLocaleChange`) into Header / Footer / `LanguageSwitcher` so the editor DE/EN control and the preview footer switcher share
   `editLocale` without navigating the admin route. `SectionHero` shows an `ImageOffIcon` + bilingual “no hero image” label when media is
   missing. `ContentSectionsEditor` seeds new blocks with empty required fields (nil UUID for unset images); it does not write German filler
   copy into the draft. `ContentSectionsRenderer` always mounts every section in the list; empty required fields and unset image uploads
   render muted italic / `ImageOffIcon` empty states so draft preview keeps layout instead of collapsing to blank space. Content blocks with
   an image use equal `@md:flex-1` columns, `items-start` so the image stays square at the top (flex stretch must not override
   `aspect-square`), `rounded-lg` + `object-cover`, and `flex-col-reverse` when `imageFirst` is false so mobile order matches the author
   toggle. Standalone image sections use `aspect-video`. Section image pickers open `ImageCropDialog` before upload (`content` 1:1 for
   content blocks, `contentWide` 16:9 for image sections); editor previews use the same aspect frames. Hero upload keeps a wide preview
   frame without a crop step. Zod still rejects empty required fields on save. CTA blocks render as a soft accent panel (`bg-accent/10`,
   `border-l-4 border-accent`, `rounded-xl`) so they read as a distinct action moment against the warm page canvas (`--secondary` white wash
   is invisible there). CTA body and quote text keep textarea newlines via `whitespace-pre-wrap` (content body and Q&A answers are markdown
   via `MarkdownBody`). Q&A blocks (`kind: 'qa'`) render through
   [`SectionQuestionsAndAnswers`](../../src/web/sections/SectionQuestionsAndAnswers.tsx) (height expand via `grid-template-rows` 0fr↔1fr,
   200 ms `ease-out`). Cook/testimonial saves share the entity subscription with page upserts — detail pages keep a dirty ref so those side
   saves do not wipe unsaved page form state.
5. **Publish** — unified nullable `publishedAt` on all four entities (`null` = draft; public requires `publishedAt <= now()`). Admin detail
   editor exposes status (Draft / Published / Scheduled). Primary actions are **Save** and **Publish** (draft / scheduled only; confirm
   dialog, persists immediately). Secondary actions live in an ellipsis overflow menu: **Public page** (opens the public detail route in a
   new tab), **Schedule…** ([`DatePicker`](../../src/web/components/base/date-picker.tsx); draft / scheduled only), **Unpublish**, and
   confirmed **Delete**. Delete is detail-only (not on list views).
6. **Slugs** — unique `pathName` + `previousPathNames` for 301 redirects on rename.
7. **Media** — hero and section images reference `FileUploads`; download auth allows owner, published content references, or admin + any
   content reference. Section images are client-cropped (`content` / `contentWide`) before upload; hero remains uncropped.

## Alternatives considered

| Option                                                            | Why rejected                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Separate section types per entity                                 | Duplicates editors, GraphQL unions, and validation            |
| TipTap / Lexical in v1                                            | Markdown + live preview matches legal editor and ships faster |
| Always-live cities / `isActive` partners / `publishingDate` blogs | Asymmetric publish models; one `publishedAt` is enough        |

## Consequences

- Entity pages pass identity via `identityFields` and page-body extras via `extraFields` on `ContentPageEditor`.
- Admin list views create/open entries only; destructive delete lives on the detail editor with an alert dialog.
- Featured cooks and testimonials curation are shipped for cities/partners/occasions (see [`testimonials.md`](../features/testimonials.md));
  the partner and occasion cook pickers use server-side search inside the choose-chefs dialog (cities filter travel-radius candidates
  locally). Home HowItWorks / KnownFrom / promo bands are shipped on `/` (see [`landing.md`](../features/landing.md)); city detail pages
  also mount HowItWorks, SectionCities, and KnownFrom (plus a fixed first-section CTA and stock hero/CTA image fallbacks — see
  [`cities.md`](../features/cities.md)). Partner detail pages mount HowItWorks (CTA hidden; optional alternative media) and KnownFrom (see
  [`partners.md`](../features/partners.md)). Occasion pages stay without them by design (see [`occasions.md`](../features/occasions.md)).
- Public images need the widened file-upload GET rule documented in [`file-storage.md`](./file-storage.md).
