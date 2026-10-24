# Theme

peopleeat is **light-only**. There is no dark mode, theme toggle, or `next-themes` provider.

## Palette

| Token        | Hex       | Role                                    |
| ------------ | --------- | --------------------------------------- |
| `text`       | `#040316` | Foreground / body copy                  |
| `background` | `#fffdf9` | Page canvas                             |
| `primary`    | `#404040` | Primary actions, strong UI chrome       |
| `secondary`  | `#ffffff` | Cards, popovers, elevated surfaces      |
| `accent`     | `#ff8a05` | Highlights, focus rings, brand emphasis |
| `muted`      | derived   | Subtle surfaces and neutral hover fills |
| `success`    | derived   | Positive accents (charts, misc.)        |
| `info`       | derived   | Neutral accents (charts, misc.)         |
| `warning`    | = accent  | Alias of brand accent (not status UI)   |

These map onto shadcn CSS variables in `src/styles.css` (`--foreground`, `--background`, `--primary`, `--secondary`, `--accent`,
`--success`, `--info`, `--warning`, plus derived muted/border/ring/sidebar tokens).

`src/styles.css` excludes `docs/` from Tailwind's class scanner (`@source not "../docs"`) so editing these docs — which mention utility
names like `bg-primary` — does not rebuild CSS or trigger Vite HMR. `vite.config.ts` also ignores `**/docs/**` in `server.watch`.

Status banners, badges, and icons follow [`status-messaging.md`](./status-messaging.md) (shared blue / green / yellow / red maps in
`status.ts`). Booking lifecycle pills use a related soft palette documented there — do not invent one-off status colours outside those maps.

Cook cuisine style / cooking philosophy chips use `CookProfileTags` (`bg-muted` fill). Do not use `Badge variant="secondary"` for those —
`--secondary` is white, so secondary badges disappear on `bg-card` / white surfaces. Same rule for meal/menu draft/published meta: use
`Badge variant="outline"` (border) on cards and detail pages.

## Workspace chrome density

Profile and admin inset chrome keep the breadcrumb bar close to the page body on small viewports: header `h-12` / `sm:h-14` (not `h-16`),
and content `pt-2` / `sm:pt-4` with `px-4 pb-4` (pinned-footer breakouts still cancel `-mx-4 -mb-4` against that horizontal / bottom pad).
Do not restore a tall header plus equal `p-4` on all sides — on mobile that reads as a large empty band under the trail.

## Scroll edge fades (`scroll-fade-*`)

Breadcrumbs, horizontal `TabsList`, attachment strips, and the chat message scroller opt into shadcn's `scroll-fade-x` / `scroll-fade-b`
utilities (from `shadcn/tailwind.css`). Those masks are **scroll-aware** only when the browser supports CSS scroll-driven animations
(`animation-timeline: scroll()` — Chrome / Edge today, Safari 26+).

In browsers without that API (Safari before 26, Firefox release), shadcn's default fallback paints a **static** fade on both edges. That
looks like a washed-out left edge on short breadcrumbs and tab labels even when nothing overflows. `src/styles.css` overrides that fallback
to `0px` fade sizes (via `[class*='scroll-fade']`, so variant-prefixed uses like `TabsList`'s `group-data-…:scroll-fade-x` match too) so
unsupported engines show crisp text and keep native scrolling; Chrome still gets the scroll-gated mask. Prefer that degradation over a false
affordance. Remove the override only if upstream ships a fix for [shadcn-ui/ui#11291](https://github.com/shadcn-ui/ui/issues/11291) (or
equivalent) and we upgrade past it.

Horizontal `TabsList` adds mouse affordances on top of the fade: start/end chevrons only while that edge can scroll, and a non-passive
`wheel` listener that remaps vertical delta to `scrollLeft` when the row overflows (so a regular mouse can reach clipped tabs without
Shift). Breadcrumbs and attachment strips stay fade-only for now.

## Scrollbar gutter

Two scroll models share one stylesheet:

| Model                                                                                                  | Who scrolls                                             | Document gutter                                          | Inset gutter                                              |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Public pages                                                                                           | `html` / document                                       | `scrollbar-gutter: stable both-edges` on `html`          | n/a                                                       |
| Workspace shells (`/admin/*`, `/profile/*`, `/booking-request/form`, `/booking-request/$id/submitted`) | Inset pane between chrome (and optional assistant rail) | Opt out via `html.workspace-no-document-scroll` (`auto`) | One-sided `scrollbar-gutter-stable` on the scrolling pane |

Public pages keep symmetric document gutters so overflow and scroll-lock do not jump the layout left/right. Workspace routes never
document-scroll, so reserving gutters on `html` would be empty wasted strips next to the sidebars — `RootDocument` toggles
`.workspace-no-document-scroll` from the locale-stripped path (`isWorkspaceNoDocumentScrollPath`). Overlay-scrollbar environments (typical
macOS) do not paint gutters either way.

### Route scroll reset

TanStack Router’s `scrollRestoration` tracks every scrolled element. Workspace inset panes sit outside `window`, so without an explicit list
the previous pane’s `scrollTop` is copied onto the next route (same DOM path or shared `data-scroll-restoration-id`). `src/router.tsx` sets
`scrollToTopSelectors` for the marked scrollports; forward navigations land at the top, back/forward still restore from the cache.

| `data-scroll-restoration-id` | Owners                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `workspace-inset`            | `AdminPageChrome`, profile `ProfileAssistantPane` content pane                      |
| `workspace-pinned`           | `AdminPinnedFooterLayout` / `ProfilePinnedFooterLayout` body (when `contentScroll`) |
| `booking-form`               | Booking-request form + submitted page scrollers                                     |

New shell scrollports that own route-level scrolling must take one of these ids (or add a selector in `scrollToTopSelectors`). Do not mark
chat `MessageScroller` viewports — they open at bottom / last-anchor per [chat.md](./chat.md).

Classic scrollbar thickness is `scrollbar-width: thin` on `*` in `src/styles.css` so every nested scrollport (shell panes, tab panels, chat,
dialogs) matches — do not leave some surfaces on the platform default.

Inset owners: `AdminPageChrome`, profile shell content panes, pinned-footer layouts, booking-form scroller, and chat transcripts. Keep those
one-sided (lane next to the classic scrollbar only) — do **not** use `both-edges` inside shells or chat; the left edge is already framed by
nav/header.

Pinned-footer layouts (`[data-pinned-footer-layout]`) and other nested-scroll owners (`[data-workspace-fill]`) introduce an inner
scrollport. Shell panes marked `workspace-inset-scroll` use `:has([data-pinned-footer-layout])` / `:has([data-workspace-fill])` (descendant,
not only direct child) to drop their own bottom spacer, `overflow-y-auto`, and `scrollbar-gutter: stable` while that owner is mounted —
otherwise the idle outer gutter shows as empty space to the right of the `w-[calc(100%+2rem)] -mx-4` breakout, and the `::after` 1rem spacer
leaves a gap under the action bar when a `display: contents` wrapper (e.g. LiveKit room) sits in between. Offer/chat pages that scroll
inside tabs pass `contentScroll={false}` so the pinned-footer body does not reserve a second idle gutter either.

Content-sized shell pages must not use `flex-1` / `min-h-0` on the page root: the inset is a flex column, and a flex-grown child prevents
the shared `::after` bottom spacer from sitting past the last content. Leave bottom padding to `workspace-inset-scroll`; do not add
page-level `pb-*` / `mb-*` for the same job.

Radix modal layers (Select, Dialog, …) still run `react-remove-scroll`, which adds a matching `margin-right` / `padding-right` on
`body[data-scroll-locked]`. With a stable gutter that second offset is a double reserve and shifts the layout left. The base stylesheet
zeroes those injected offsets; do not remove that override without another way to keep Select/Dialog open from nudging the page.

## Rules

- Prefer semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, `bg-accent`) — never hard-code the hex values in components.
- Form fields (`Input`, `Textarea`, `SelectTrigger`, OTP slots, `InputGroup`, `DatePicker` / `DateRangePicker` / `DateTimePicker` /
  `TimePicker` triggers, `ComboboxChips`) use `bg-secondary` for a white fill against the warm page canvas. Keep `--input` for borders
  (`border-input`) — do not repurpose it as a fill color.
- Button hover fills for `outline`, `secondary`, and `ghost` use `muted` — not `accent`. Accent orange is for brand emphasis and focus
  rings; using it as a hover wash is too intense.
- Menu / list item focus fills (`DropdownMenuItem`, `SelectItem`, and similar) use a light accent tint (`bg-accent/15`) with
  `text-foreground` — never solid `bg-accent`.
- Skeleton placeholders (`Skeleton`) use the same light accent tint (`bg-accent/15`) — never solid `bg-accent`. Callers should not override
  the fill unless a surface truly needs a different wash.
- Large selection surfaces (calendar “today”, date-range middle fill) use `muted` or a light accent tint (`bg-accent/15`) — never solid
  `bg-accent`. Start/end selection endpoints stay on `primary`.
- Browser text selection (`::selection`) uses a light accent tint (`selection:bg-accent/25` with `selection:text-foreground`) on `body` and
  form inputs — never solid `accent` and never the default browser blue / old teal highlight.
- Do not reintroduce a `.dark` token block or a theme switcher.
- `theme-color` / PWA manifest colors stay on the warm background (`#fffdf9`).
