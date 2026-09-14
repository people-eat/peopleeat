# Motion

Motion is held to a short bar: **professional, clean, minimalistic, trustworthy, tasteful**. If a movement does not earn its place against
that bar, remove it. Forks may add [`fonts.md`](./fonts.md) / [`theme.md`](./theme.md) for typography and palette; those are optional
product layers — this doc is the motion half.

A calm product that twitches with parallax, particles, or scroll-jacked storytelling betrays intent before the reader has finished a
sentence. The rules below exist to keep that from happening.

## The one principle

**Motion answers a question the user is already asking.** When a user scrolls, they're asking "what's next?" — reveal it. When they hover a
CTA, they're asking "is this real?" — confirm it. When they submit a question, they're asking "did it hear me?" — acknowledge it. Anything
else is decoration, and decoration does not ship.

Before adding any animation, name the question it answers. If you cannot name one, the answer is no animation.

## Guardrails

These are the quantitative rules. Treat them as hard limits, not suggestions.

| Concern        | Allowed                                                                   | Forbidden                               |
| -------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| Duration       | 150–500ms                                                                 | < 150ms (jittery) or > 500ms (sluggish) |
| Easing         | `ease-out`, or `cubic-bezier(0.2, 0.8, 0.2, 1)` (out-quint)               | `ease-in`, bounces, springs, elastic    |
| Transform axes | `opacity` and small `translate` (≤ 8px) and small `translate-x` (≤ 4px)   | `scale` > 1.02, `rotate`, `skew`        |
| Loops          | Slow ambient breathing (≥ 2s, opacity-only or imperceptible translate)    | Pulsing colors, throbbing scales        |
| Trigger        | User-initiated (hover, focus, click) or natural (scroll into view, mount) | Auto-cycling carousels, attention-pulls |

**Exception — list reorder FLIP:** when the user moves an item up/down in an ordered list, the question is "did these two swap places?" The
answer requires translating each moved row by the actual swap distance (often well above 8px). Use
[`animateListReorder`](../../src/web/utils/animateListReorder.ts) only for that case: 250 ms `ease-out`, `translateY` only, skipped under
`prefers-reduced-motion: reduce`. Do not reuse large translates for decoration.

**Exception — desktop vertical sortable drag:** when the user drags a grip to reorder (cook menu courses / meal options), the question is
"where will this land?" Live sibling `translateY` shifts and a full-height dashed slot answer that while the pointer moves. Implemented with
`@dnd-kit` (`verticalListSortingStrategy`, `restrictToVerticalAxis`, `DragOverlay` with `adjustScale={false}`, 200 ms `ease-out` drop). No
horizontal drag, no scale pop. Under `prefers-reduced-motion: reduce`, layout transitions and drop animation are disabled; reorder still
works. Do not reuse this stack for decorative gesture chrome.

**Exception — assistant trigger orbit:** when the shell header mounts, the user is asking "is this the smart AI entry?"
[`AssistantTriggerButton`](../../src/web/components/AssistantTriggerButton.tsx) answers with a soft accent pill plus a **one-shot** shimmer
that travels the real border perimeter once (`assistant-trigger-orbit` in `src/styles.css`, ~1.8s, `linear`). Implemented as an SVG stroke
over a path matching the button’s asymmetric radii; `stroke-dashoffset` with `pathLength={100}` moves by arc length so speed stays even on
short and long sides (unlike a conic-gradient angle spin). One lap, then fade to the static accent outline. Not a loop; skipped under
`prefers-reduced-motion: reduce` (no SVG mounted). Do not reuse for generic CTAs or the message composer.

Anything else not on the "allowed" side needs an explicit reason in a PR description before it lands.

## Anti-patterns

Tempting but wrong without an explicit conversation:

- **Typewriter headlines.** Delays the value proposition for a parlour trick.
- **Mouse-follow / spotlight / gradient cursor.** Reads as library demo, not product.
- **Animated counters** climbing on scroll. The number matters more than the animation.
- **Floating particles, mesh gradients, animated noise, canvas backdrops** as default decoration. An ambient backdrop (if a fork adds one)
  is optional product chrome — never a second layer of ambient motion on top of it.
- **Section-pinning / scroll-jacked storytelling.** Hostile to scanners.
- **`whileInView` on paragraphs.** Animate the container, not each `<p>`.
- **Scale or fade on trust anchors** (primary logo mark, hero face/avatar when present). The moment a trust anchor animates, it stops being
  one.

## Interaction feedback (hover, focus, pressed)

A button without a pressed state feels dead on mobile — the user taps and gets nothing until the page transitions. Every interactive element
must answer "did you hear me?" the moment it is engaged:

- **`hover:`** — desktop affordance ("this is real"). Prefer color/background changes, not transform.
- **`focus-visible:`** — never strip the ring. Baseline on `Button` is `focus-visible:ring-[3px] focus-visible:ring-ring/50` (destructive
  variants use a destructive-tinted ring). Outset rings need paint room inside any clipping overflow ancestor — see
  [conventions.md — Accessibility](../conventions.md#accessibility-landmarks--names); the profile shell padding covers default page scroll,
  while nested scroll containers (e.g. chat `MessageScrollerItem`) inset locally.
- **`active:`** — the tap itself. **Every clickable element ships with one.** Prefer color/filter only (no translate). Filled dark/saturated
  buttons (primary, destructive) use `active:brightness-[0.8]` — opacity cuts alone are nearly invisible on dark fills. Light surfaces
  (outline, secondary, ghost, link) press into `active:bg-foreground/10` (stronger than `hover:bg-muted`); `link` keeps the base
  `rounded-md` so the wash reads as a rounded chip, and drops the underline while pressed.
- **`aria-current="page"`** marks the active nav item. Pair it with a distinct background.

The base `Button` primitive in `src/web/components/base/button.tsx` ships these states for every variant — use it instead of styling raw
`<a>` or `<button>` tags. When a link must point somewhere external or to a TanStack `<Link>`, use `<Button asChild>` so the pressed state
is inherited.

Touch targets: comfortable, not cramped. **Minimum 36px** (`size-9` / `py-2.5 px-4`) for any element a finger taps. **44px** (`size-10` /
`py-3 px-5`) for primary, repeated, or thumb-zone targets. Inline text links inside flowing prose are exempt.

## `prefers-reduced-motion: reduce`

**Non-negotiable.** The user's OS-level preference is honoured at every layer:

- `useInView` (`src/web/hooks/useInView.ts`) short-circuits to `inView = true` on mount when the media query matches so observed elements
  render at their final state with no transition.
- `Reveal` (`src/web/components/Reveal.tsx`) uses `motion-reduce:transition-none` (and zeroes the out-state translate) so reduced-motion
  users see the final opacity/position immediately — **no** leftover opacity fade.
- Keyframe animations in `src/styles.css` are paused inside `@media (prefers-reduced-motion: reduce)` blocks. Every new `@keyframes` entry
  must be covered by a reduced-motion rule when introduced.
- `tw-animate-css` enter/exit utilities (`animate-in` / `animate-out` on dialogs, sheets, menus, popovers) have no built-in reduced-motion
  media query — the same `styles.css` block must kill those animations globally. Spinners / skeletons carry `motion-reduce:animate-none`
  where they loop.
- One-off hover transforms suppress themselves with `motion-reduce:group-hover:translate-x-0` (or equivalent).

The product must work as a still page. Test by enabling "Reduce motion" in the OS and walking primary flows — nothing should animate,
nothing should feel broken.

Reuse `useInView` / `Reveal` for scroll-reveal — do not invent a third intersection observer.

## Composer states

The `MessageComposer` (`src/web/components/MessageComposer.tsx`) holds the same bar — no continuous loops, no decorative sweeps. Each state
answers one question:

| State       | User's question                    | Visual                                                                                                                                                    |
| ----------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Focus**   | "Am I in the right field?"         | Same ring as `Input` / `Textarea` / `InputGroup`: `border-ring` + `ring-[3px] ring-ring/50` on the `InputGroup` (also used for drag-over).                |
| **Ready**   | "Did it notice I typed something?" | Send button lifts `−1px` and fades from muted to full opacity (`enabled:-translate-y-px`, 200 ms). Stops when the draft is empty again.                   |
| **Sending** | "Did it hear me?"                  | `SendIcon` crossfades to a `Spinner` (150 ms) inside the Send button.                                                                                     |
| **Sent**    | "Did it land?"                     | `CheckIcon` flashes in the Send button slot for 700 ms when `onSubmit` resolves `true` (may overlap a still-busy generation), then reverts to `SendIcon`. |

Everything beyond these four states — rotating borders, sweeping highlights, particle effects, gradient cursors, animated placeholders — is
decoration. Don't add it without writing the question it answers into the PR description first.

Chat presentation rules (scroll, transcript, streaming) live in [chat.md](./chat.md).

## Shared primitives

Before writing a new motion, check whether one of these already covers it:

| Primitive              | Location                                                  | Use when                                                                                                                                |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `useInView`            | `src/web/hooks/useInView.ts`                              | Detect first scroll-in for a single element                                                                                             |
| `Reveal`               | `src/web/components/Reveal.tsx`                           | Fade and lift a section or grid child into view                                                                                         |
| `animateListReorder`   | `src/web/utils/animateListReorder.ts`                     | FLIP swap when the user moves a list item up/down (`data-reorder-id` children). See reorder exception above.                            |
| `@dnd-kit` sortable    | `CookMenuCoursesEditor` (courses + meal options)          | Desktop vertical drag reorder with live sibling shifts + reserved drop slot. See sortable-drag exception above.                         |
| Radix dialog / popover | `src/web/components/base/*`                               | Open / close transitions — use the stock fade + zoom-in, don't layer more                                                               |
| Thoughts disclosure    | `src/web/components/AssistantReasoning.tsx`               | Expand/collapse of thought summaries — height (`grid-template-rows` 0fr↔1fr) + chevron rotate, 200 ms `ease-out`. No opacity fade       |
| FAQ accordion          | `src/web/sections/SectionQuestionsAndAnswers.tsx`         | Expand/collapse of Q&A rows — same height clip + chevron rotate as Thoughts. Used on landing / chef pages and content `qa` blocks       |
| Nested tool steps      | `src/web/components/chat-message/ChatMessageToolCall.tsx` | Expand/collapse of indented nested tool rows — same height clip as Thoughts                                                             |
| Nav progress grow      | `src/styles.css` (`nav-progress-grow`)                    | Top-of-viewport navigation bar — see [navigation-progress.md](./navigation-progress.md)                                                 |
| Assistant trigger      | `src/web/components/AssistantTriggerButton.tsx`           | Shell header AI entry — soft accent pill + one-shot perimeter SVG shimmer (`stroke-dashoffset`). See assistant-trigger exception above. |
| `AutoplayVideo`        | `src/web/components/AutoplayVideo.tsx`                    | Decorative muted loops (hero, experience cards, how-it-works). Safari-hardened mute + play retry; paused under reduced motion.          |

Compose these before reaching for a dependency. `tw-animate-css` provides Radix data-attribute transitions; that's the floor, not a starting
kit. List reorder FLIP is covered by `animateListReorder`. Desktop vertical sortable drag (live sibling shift + reserved drop slot) is the
one approved `@dnd-kit` case — see the exception above. If you find yourself wanting Framer Motion or broader gesture/layout animation,
write the case in the PR description first.

## How to add a new motion

1. **Name the question.** Write one line in the PR description: "When the user does X, they're asking Y. This motion confirms Y." If you
   can't, stop.
2. **Pick the cheapest primitive.** Tailwind transition utilities beat a custom keyframe. A keyframe beats a JS animation. A JS animation
   beats a library.
3. **Stay inside the guardrails table.** If the motion needs scale, bounce, or duration outside 150–500ms, simplify rather than expand the
   guardrails.
4. **Wire reduced-motion** at the layer you're working in — hook-level, component-level, or `@media` block. Test it by toggling the OS
   setting.
5. **Document where it lives.** Page-specific motion goes into the feature doc. Reusable primitives go into the table above.

## File locations

| Concern                                | File                                  |
| -------------------------------------- | ------------------------------------- |
| Reveal component                       | `src/web/components/Reveal.tsx`       |
| Intersection-observer hook             | `src/web/hooks/useInView.ts`          |
| List reorder FLIP                      | `src/web/utils/animateListReorder.ts` |
| Keyframes + reduced-motion media query | `src/styles.css`                      |
| This doc                               | `docs/styles/motion.md`               |
