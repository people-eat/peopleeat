# Chat

Every chat surface — assistant rails, offer negotiation, support — is held to the same product bar for chrome and trust. Scroll behaviour
splits into **two transcript modes** so each use case gets the right focus model.

This doc is about the **desired chat experience** — how a chat looks, how it scrolls, how the composer feels, and how shared transcript /
composer primitives are composed. It is not about the message union, streaming machinery, tool-call approval flow, or LLM replay — those
live in [`docs/architecture/chat.md`](../architecture/chat.md) and
[`docs/architecture/chat-persistence.md`](../architecture/chat-persistence.md). Index: [`features/chat.md`](../features/chat.md).
Attachments: [`chat-persistence.md#attachments`](../architecture/chat-persistence.md#attachments).

## The one principle

**Every chat surface shares the same product chrome; transcripts use one of two scroll modes.** Chat is where trust is either earned or lost
— a jittery scroll, a lost draft, a hover-only copy button on mobile, an assistant reply that appears without streaming — any one of those
breaks the illusion that a considered counterpart is on the other end.

| Mode          | Surfaces                                               | Open position                    | Turn anchors                         |
| ------------- | ------------------------------------------------------ | -------------------------------- | ------------------------------------ |
| **assistant** | Admin rail, admin transcript, future profile assistant | Last user turn flush at top      | `scrollAnchor` on user turns         |
| **human**     | Offer chat, support chat                               | Absolute bottom (latest message) | **None** — messenger stick-to-bottom |

Pick the mode with `ChatTranscriptShell`’s `mode` prop (`assistant` default, `human` for peer threads). Do not invent a third scroll engine
per surface.

Before adding _anything_ chat-shaped — a new surface, a new message variant, an extra button in the composer — check: does it obey the
shared rules and the correct mode already, or does it break one? If it breaks one, the answer is almost always to reach past the surface
into the shared primitive and add the rule there, not to bend the rule for the new surface.

---

## Shared product chrome

Rules below apply to **both** modes.

### Opening — empty state and mount

| Rule                                                                               | Where it lives                               |
| ---------------------------------------------------------------------------------- | -------------------------------------------- |
| No JS `scrollIntoView` on mount — the primitive lands the reader before paint      | `MessageScroller`                            |
| The empty state renders **inside** the transcript viewport, not above the composer | Surface layout (`grid grid-rows-[1fr_auto]`) |

**Why not `scrollIntoView`.** A JS scroll on mount produces a visible flash — first paint at the top, then a jump to the tail.

**Why the empty state stays in the viewport.** If the empty state renders _above_ the composer, the composer moves as soon as the first
message lands. Keeping it in the viewport row of `grid grid-rows-[1fr_auto]` means the composer is sticky-bottom in every state.

When a surface still uses a hand-rolled scroller, migrate toward `ChatTranscriptShell` / `MessageScroller` (see
[Shared primitives](#the-shared-primitives)) rather than inventing a second stick-to-bottom implementation.

### Stick-to-bottom — follow while at the edge, never yank

| Concern                                    | Value                                                              |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Stick-to-bottom edge threshold             | **64 px**                                                          |
| Jump-to-latest pill visibility             | **only while not at the live edge**                                |
| Auto-follow enabled                        | **`autoScroll` on `MessageScrollerProvider`**                      |
| Auto-follow interrupts on                  | **any user scroll up, keyboard nav, text selection, or link open** |
| Position preservation on prepended history | **free** — the primitive handles it                                |

**Follow while at the live edge, never yank a reader who scrolled up.**

**Do not** hand-roll `scrollIntoView` or a home-grown `isAtBottom` toggle. Route through `ChatTranscriptShell` so every surface inherits the
shared values for its mode.

**Do not** wrap scroll items in extra DOM parents (date `<section>`, `aria-live` regions). The primitive only sees direct children of
Content — nested items break follow-output and (in assistant mode) turn anchoring.

### Scrollbar gutter — reserved, never over the bubbles

Classic scrollbars grow/shrink content width when they appear. In chat that shows up as a left–right jump on right-aligned user bubbles.

| Rule                                                                                                                              | Where it lives                                                            |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| The viewport reserves `scrollbar-gutter: stable`                                                                                  | Transcript viewport / shell                                               |
| Thin scrollbar (`scrollbar-width: thin`)                                                                                          | App-wide in `src/styles.css` (`*`); transcript also sets `scrollbar-thin` |
| Viewport inset is `pl-2 pr-0` — right breathing room is the item’s `p-1` (shadow bleed), not a second `pr-*` on top of the gutter | Transcript shell + `MessageScrollerItem`                                  |
| **Never** hide the bar with `scrollbar-none` / `scrollbar-width: none` on the transcript viewport                                 | —                                                                         |
| A surface **must not** turn the gutter off via `viewportClassName`                                                                | Review-time reject unless widening the reserved lane                      |

### Message rendering

| Rule                                                                                                                                           | Where it lives                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| User messages are **right-aligned bubbles** when `isOwn`; peer user messages use the assistant (left) rail                                     | `ChatMessageUserView` + `Bubble`                                          |
| Peer (`!isOwn`) streaks follow **modern WhatsApp**: name **inside** the first bubble; avatar **only** on the last (bottom-aligned)             | `ChatMessageUserView` + `peerUserMessageStreak`                           |
| Mid-streak peer bubbles keep an avatar-width spacer (no name / no avatar) and a fully rounded bubble (no speaker tail)                         | `showAuthorName` / `showAuthorAvatar` + `Bubble tail`                     |
| Consecutive same-author peer bubbles **tighten vertical gap**                                                                                  | Offer / assistant transcripts via `streak.continued`                      |
| User text **clamps to two lines** (expand chevron) only when `collapseLongBody` is true — assistant chats on, offer threads off                | `UserMessageBody` gated by `ChatMessageUser.collapseLongBody`             |
| Assistant text is **unbubbled markdown flush in the row**                                                                                      | `AssistantMarkdown` inside assistant `MessageRow`                         |
| **System rows (tool calls, approval request/response) are left-aligned**, not centred                                                          | `MessageRow side="system"` → `justify-start`                              |
| **Offer domain events are centered milestone pills** (hairlines + small circular tone icon + StatusBadge-density surface), not bare muted text | `MessageRow side="milestone"` + `ChatMessageBookingRequestOfferEventView` |
| **Date markers are centered muted pills** — sentence case, no hairlines; label is Today / Yesterday / long date (full month)                   | `ChatDateMarker` + `formatChatDateMarker`                                 |
| Offer domain events render a bilingual label (+ optional payload detail), not raw enum strings                                                 | `ChatMessageBookingRequestOfferEventView`                                 |
| Tool rows show a **friendly, bilingual tool label** — never the raw tool id                                                                    | Tool display helper when present; raw id in inspector                     |
| The **trailing tool row shimmers** while the turn is in flight, then settles                                                                   | Driven by `isGenerating` + live-turn message ids                          |
| Tool rows carry a **status glyph** — spinner / check / alert                                                                                   | Tool result interpreter when present                                      |
| Tool rows show a **one-line markdown result summary** when the tool returns one                                                                | `ToolResultSummary` when present                                          |
| The **full args + result JSON** live behind an inspector dialog, never inline; each section has a **copy** button                              | `ToolArgumentsButton`                                                     |
| Nested child tool rows under a parent delegate are **collapsible**                                                                             | Parent pill workflow toggle                                               |
| **No avatars** on own user messages, assistant text, system rows, or offer milestones                                                          | Peer `ChatMessageUser` only                                               |
| Every assistant text row ships **timestamp + copy** (and TTS / sources / fork when those features exist), always visible on touch              | `chat-message/shared.tsx`                                                 |
| Every user text row ships the **send time inside the bubble** (bottom-right, ~10 px); copy only when `showCopyButton` is true                  | `ChatMessageUserView` (`showCopyButton` wire-only, always false today)    |
| Admin offer chat may pass `onEdit` → pencil in the bubble opens a dialog to replace the body (phone gate + empty-without-attachments block)    | `ChatMessageUserView` + `BookingRequestOfferChat.onEditMessage`           |
| Copy button copies **raw markdown**, not rendered text; flashes check for **1.5 s**                                                            | `CopyButton`                                                              |
| Bubble max-width                                                                                                                               | `max-w-[80%]` of the row                                                  |
| Bubble radius                                                                                                                                  | `rounded-2xl`, with corner cut toward the speaker                         |
| Input-collection slots carry **no type headline** — the slot's prompt + control are self-describing                                            | Input-collection view                                                     |
| Collection card is `max-w-md` and `min-w-0` down the flex/grid chain; select placeholders are short (“Bitte wählen…” / “Select…”)              | Input-collection view                                                     |
| CardList is a **container-query grid**: 1 col → 2 cols from ~28 rem → 3 cols from ~42 rem (`upToTwo` meal/menu: 2 cols only from ~36 rem)      | `ChatCardList` (`@container` wrapper; `@min-*` on the grid)               |

#### Nested tool steps

When a parent `delegateTo*` row has child tool-call rows (see [agent-delegation.md](../architecture/agent-delegation.md)), render them in an
indented list under the parent pill. That list is **collapsible**: open while the parent is the live active tool; collapsed by default on
settled rows; user toggles sticky until the parent becomes active again. Animate height the same way as Thoughts (`grid-template-rows`
0fr↔1fr, 200 ms `ease-out`, no opacity fade; `motion-reduce:transition-none`). Active-driven open stays instant so stick-to-bottom is not
fought.

**Why system rows go left, not centre.** Tool calls and approval cards are the assistant's own actions, not neutral announcements. Aligning
them to the assistant (left) rail keeps the human↔assistant exchange owning the centre.

**Why offer domain events are centered.** Accept / price / menu / call-slot milestones are negotiation timeline anchors, not a speaker on
either rail. A compact centered pill — StatusBadge density (`rounded-full`, soft tone surface, small circular tone icon with an
event-specific Lucide glyph), bilingual label, optional detail + time — sits between hairline rules. Intentional without competing with
human messages. Bare muted text for milestones is a bug.

**Why date markers are pills without hairlines.** Day separators are quiet orientation chrome, not timeline events. A soft light-gray
`rounded-full` pill (`bg-foreground/[0.03]`) with sentence-case Today / Yesterday / long date (no `uppercase`, no abbreviated month) matches
messenger norms and keeps text contrast against the warm page background. Hairlines stay on offer milestones so the two centered markers do
not compete.

**Why peer avatar + name only.** Multi-party offer threads need to show who sent a received message. Own bubbles already sit on the right
rail — repeating the viewer's identity there is noise. Assistant, system, and milestone rows are not person-attributed.

**Why collapse consecutive peer identity.** Repeating avatar + name on every short bubble clutters the rail. Match modern WhatsApp: name
inside the first bubble of a streak, avatar only beside the last (bottom-aligned), spacer-aligned mid-streak bubbles, tighter gap between
them.

**Why unbubbled assistant markdown.** Long-form markdown needs unclipped width. A bubble clips tables and code.

**Why timestamp + copy always visible on assistant rows.** Hover-only actions are hostile on mobile.

**Why raw markdown for copy.** Power users paste into tools that render markdown themselves.

### Internal vs external links

Assistant markdown renders through `AssistantMarkdown` (Streamdown). Override Streamdown's default anchor so every href is not treated as
external:

- **Incomplete** (`streamdown:incomplete-link`, emitted mid-stream) → styled but inert.
- **Internal** (a single leading slash, not `//host`) → SPA `router.navigate`, locale-prefixed to the current page. Modified clicks
  (⌘/Ctrl/Shift/Alt, non-primary button) fall through so "open in new tab" still works.
- **External** → per-surface confirmation via `ExternalLinkConfirmationProvider`. Public surfaces may enable the bilingual confirm dialog;
  privileged surfaces may disable it. Internal links ignore this flag. Authored (non-chat) markdown uses `MarkdownBody`, which turns
  Streamdown’s built-in `linkSafety` interstitial off entirely — legal pages and CMS sections open links directly.

### Composer — hard rules

Every chat composer wraps `MessageComposer` (`src/web/components/MessageComposer.tsx`). Anything that hand-rolls a textarea + send button is
a review-time reject.

| Concern                | Value                                                                                                                                                                                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Submit key             | **Desktop:** Enter sends; Shift+Enter inserts a newline. **Mobile:** Enter inserts a newline; only Send submits.                                                                                                                                                                                    |
| Auto-grow              | **`field-sizing: content` + max height cap** (`max-h-37.5`); expands to a block-end action row when multiline or attachments are present                                                                                                                                                            |
| Shell                  | Stock `InputGroup` chrome — same `rounded-md border border-input bg-secondary shadow-xs` as `Input` / `Textarea`; no outer pill wrapper                                                                                                                                                             |
| Focus ring             | Stock `InputGroup` focus (`border-ring` + `ring-[3px] ring-ring/50`); same ring on drag-over — see [motion.md — Composer states](./motion.md#composer-states)                                                                                                                                       |
| Ready micro-state      | Send **lifts `-translate-y-px`** and fades muted → full opacity, 200 ms                                                                                                                                                                                                                             |
| Sending                | **`SendIcon` crossfades to `Spinner`**, 150 ms (`submitting` prop; falls back to `busy`)                                                                                                                                                                                                            |
| Sent                   | **`CheckIcon` flashes for 700 ms** when `onSubmit` resolves `true` — can show while generation remains `busy`                                                                                                                                                                                       |
| Send control           | **Icon-only** round `size="icon-sm"` button (`rounded-full`); label lives in `aria-label` + tooltip                                                                                                                                                                                                 |
| Post-turn focus        | Textarea **refocuses** on `busy → !busy` only if the composer still owns focus (desktop); cancelled if the user interacts elsewhere                                                                                                                                                                 |
| Draft restore on error | Restore the trimmed message and call `endTurn()`; `onSubmit` returns `false` so Sent does not flash                                                                                                                                                                                                 |
| Locked while streaming | Textarea + Send disabled while `busy === true`                                                                                                                                                                                                                                                      |
| Content-policy gate    | `sendDisabled` disables Send only (textarea stays editable) — e.g. offer-chat phone-number block                                                                                                                                                                                                    |
| Attachments (opt-in)   | Paperclip, drop zone, paste; `Attachment*` tiles; parent owns upload lifecycle — see [chat-persistence.md#attachments](../architecture/chat-persistence.md#attachments). Narrow rails may hide the inline paperclip (`showAttachButton={false}`) and open the picker from an overflow menu instead. |
| Tool-approval mode     | Lives in the assistant `ChatComposer` overflow menu (radio group), not an inline Select — keeps the sidebar input row usable.                                                                                                                                                                       |
| Disclaimer             | AI verify line under the shell by default (`showDisclaimer`; opt out per surface)                                                                                                                                                                                                                   |
| Textarea `name`        | Defaults to `'message'`                                                                                                                                                                                                                                                                             |
| `autoFocus`            | Opt-in via prop; deferred until `!busy` on desktop                                                                                                                                                                                                                                                  |

`ChatComposer` (`src/web/chat/ChatComposer.tsx`) owns draft state, upload lifecycle, and the `beginTurn` / `endTurn` handshake for
`chatMessageCreate` surfaces. Audience wrappers (if a fork adds more than one chat product) sit above it — never beside a raw `<textarea>`.

### Layout — paddings, max-widths, breakpoints

Prefer CSS variables in `src/styles.css` (`--chat-*`) so surfaces read the same value in one place.

| Concern                       | Guidance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transcript vertical padding   | Comfortable top/bottom so the composer gap reads ~24 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Transcript horizontal padding | ~16 px mobile / ~24 px desktop                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Message column max-width      | Roughly `max-w-3xl` (48 rem) for continuous prose; narrower sheet caps are fine for overlay chat                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Row gap inside a date group   | ~16 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Gap between date groups       | ~32 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Composer safe-area            | `pb` accounts for `env(safe-area-inset-bottom)` on iOS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Sticky composer               | Bottom row of `grid grid-rows-[1fr_auto]` (or `[auto_1fr_auto]` with a title bar) on every surface; fill the shell under chrome, do not use full-viewport `h-dvh` inside a headed inset. Composer row keeps the same horizontal padding as the transcript viewport so the `InputGroup` focus ring is not clipped by a parent `overflow-hidden`. Admin review chrome may portal the offer composer into `AdminPinnedFooterLayout` (`BookingRequestOfferChat` `externalComposer` / `composerHost`) so transcript scroll stays above a multi-row action bar |
| Human-chat presence banner    | Offer (`BookingRequestOfferChat`) and support (`SupportRequestChat`) presence rows dual-render: **inside** `MessageScroller` below `md` (scrolls away), **static** above the transcript from `md` up. Grid is `[1fr_auto] md:[auto_1fr_auto]`. No `scrollAnchor` on the presence item. Offer product copy: [booking-offer-chat.md — Behavior](../features/booking-offer-chat.md#behavior)                                                                                                                                                                |
| Bubble max-width (both tones) | `max-w-[80%]` of the row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

### Accessibility

| Rule                                                                                 | Where                                  |
| ------------------------------------------------------------------------------------ | -------------------------------------- |
| Streaming assistant text renders inside `aria-live="polite" aria-atomic="false"`     | Streaming item itself — no wrapper     |
| Composer textarea has an explicit `name`                                             | `MessageComposer`                      |
| Send button has an `aria-label` matching the localised "Send" tooltip                | `MessageComposer`                      |
| Assistant / user action icon buttons expose localised tooltips matching `aria-label` | Copy / TTS / sources / etc.            |
| Jump-to-latest pill has an SR-only label                                             | Jump button                            |
| `prefers-reduced-motion` suppresses the Send-button lift                             | `motion-reduce:…` in `MessageComposer` |
| Escape closes sheet / dialog surfaces                                                | Radix defaults — do not override       |

**Why `polite` not `assertive`.** `assertive` interrupts whatever the screen reader is currently reading.

### Bilingual copy

Every user-facing string in a chat surface uses the inline `{ de: '…', en: '…' }[locale]` literal at the call site (see
[`docs/conventions.md`](../conventions.md#bilingual-copy)). Strings the shared primitives own (Send, Jump to latest, Thinking… / Denke
nach…, copy / TTS labels) live in the primitive — not in each surface — so both languages stay coherent across every chat surface.

### The shared primitives

| Primitive                                          | File                                                                        | Use when                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `MessageComposer`                                  | `src/web/components/MessageComposer.tsx`                                    | Any chat-style textarea. Never hand-roll one.                            |
| `ChatComposer`                                     | `src/web/chat/ChatComposer.tsx`                                             | Surface fires `chatMessageCreate`. Owns draft + uploads + turn handshake |
| `ChatTranscriptShell` / `MessageScroller*`         | `src/web/components/base/chat-transcript-shell.tsx`, `message-scroller.tsx` | Canonical scroll container; `mode` selects assistant vs human config     |
| `Attachment*`                                      | `src/web/components/base/attachment.tsx`                                    | File/image tile primitive for composers and tool results                 |
| `ChatMessageParts` / `ChatMessage`                 | `src/web/components/chat-message/`                                          | Parts renderer + assistant/human row entry points                        |
| `ChatDateMarker` / `formatChatDateMarker`          | `src/web/components/chat-message/ChatDateMarker.tsx`, `src/web/chat/`       | Day-group pill (Today / Yesterday / long date) for every transcript      |
| `AssistantReasoning`                               | `src/web/components/AssistantReasoning.tsx`                                 | Thought-summary disclosure                                               |
| `AssistantMarkdown`                                | `src/web/components/AssistantMarkdown.tsx`                                  | AI markdown (locale-aware internal hrefs, external-link confirm)         |
| Row atoms (`MessageRow`, `ToolArgumentsButton`, …) | `src/web/components/chat-message/shared.tsx`                                | Row-level atoms including args inspector dialog                          |
| `ChatCardList`                                     | `src/web/components/chat-message/ChatCardList.tsx`                          | Card grid (`responsive` or `upToTwo` for meal/menu rows)                 |
| `toolDisplay` / `interpretToolResult`              | `src/web/chat/toolDisplay.ts`, `toolResult.ts`                              | Friendly bilingual tool labels + status                                  |
| `peerUserMessageStreak`                            | `src/web/chat/chatTranscript.ts`                                            | Peer streak chrome: name on first bubble, avatar on last                 |
| `useChatTurnLiveUpdates`                           | `src/web/chat/useChatTurnLiveUpdates.tsx`                                   | `chatTurnUpdates` subscription + revision merge                          |

---

## Assistant transcript mode

Use for human↔AI chats (`ChatTranscriptShell mode="assistant"`, the default). Industry norm: ChatGPT, Claude.ai, Gemini — open on the last
user turn so the reply stays in focus.

### Opening — anchor, don't dump

| Rule                                                            | Where it lives                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| Open at the **last meaningful anchor**, not the absolute bottom | `MessageScrollerProvider defaultScrollPosition="last-anchor"` |

**Why the last anchor, not the bottom.** Returning to a chat should drop the reader at the last user message with its reply visible — not
past everything with no context.

### Streaming — one channel, one slot, no polling

| Rule                                                               | Where it lives                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Every AI reply **streams**. Non-streaming is a bug                 | Server (`chatTurnUpdates` subscription), client (`useChatTurnLiveUpdates`)     |
| The streaming assistant message is **pre-allocated** with the turn | `chatMessageCreate` + `chatTurnRun`                                            |
| The persisted row keys on the same id — swap is a React no-op      | Transcript streaming section keyed on the pre-allocated id                     |
| Send **never refetches**                                           | Initial query + `chatTurnUpdates` subscription; no `mutate → refetch` anywhere |
| Pending status is a **shimmer**, not a spinner                     | Pending row while `isGenerating &&` no streaming text yet                      |

**Why streaming is non-negotiable.** Perceived latency drops the moment the first token paints. A non-streaming assistant reads as broken.

**Why pre-allocated ids.** `chatMessageCreate` inserts the turn with a pending assistant message before the runner starts. Live updates
publish turn snapshots keyed by `chatTurnId` + `revision`; the client merges by revision so streaming parts replace in place. See
[Chat Foundation](../architecture/chat.md).

**Why no refetch on send.** A `refetch()` races the subscription and can flash older revisions over newer ones.

**Why a turn-level pending row.** While the assistant message is `PENDING` / empty streaming, show chef-flavored pending shimmer. Tool parts
with in-flight states render their own pending labels via `toolDisplay`.

**Thought summaries.** When the model emits reasoning / thought parts, publish them as reasoning chunks keyed on the current LLM step's
pre-allocated `chatMessageId` and render a collapsed disclosure via `AssistantReasoning` **above the message that step produced**. User
toggles animate height + chevron rotate (200 ms `ease-out`) — height clip only, no opacity fade. Live-driven open/close stays instant.
`prefers-reduced-motion` skips the transition. See [motion.md](./motion.md).

### Scroll during streaming — turn focus

| Concern                           | Value                                                                  |
| --------------------------------- | ---------------------------------------------------------------------- |
| Anchor new turns                  | **flush at top of viewport** (`scrollAnchor` on the **user** row only) |
| Previous-item peek on turn anchor | **0 px** (`scrollPreviousItemPeek={0}`)                                |

Streaming / assistant / tool rows must **not** set `scrollAnchor`. Stick-to-bottom / jump-to-latest / edge threshold are shared (see
[Stick-to-bottom](#stick-to-bottom--follow-while-at-the-edge-never-yank)).

### Composition

```text
MessageScrollerProvider (defaultScrollPosition="last-anchor", scrollEdgeThreshold=64, scrollPreviousItemPeek=0, autoScroll)
└── MessageScroller
    ├── MessageScrollerViewport
    │   └── MessageScrollerContent   ← every MessageScrollerItem is a *direct* child
    │       ├── MessageScrollerItem (date marker, no scrollAnchor)
    │       ├── MessageScrollerItem scrollAnchor={user?} + ChatMessage
    │       ├── …
    │       ├── MessageScrollerItem (pending while isGenerating && no stream)
    │       └── MessageScrollerItem (streaming, aria-live, no scrollAnchor)
    └── MessageScrollerButton direction="end"  ("Jump to latest")
```

**Direct children only.** Nesting items in a date `<section>` or an `aria-live` region silently breaks stick-to-bottom and `last-anchor`.

The admin assistant rail (`AdminAssistantSidebar`) composes sidebar header → scrollable transcript → pinned composer.

---

## Human transcript mode

Use for human↔human chats — offer negotiation and support (`ChatTranscriptShell mode="human"`). Industry norm: WhatsApp, iMessage, Slack —
open at the latest message and keep the live edge in view when new messages arrive.

### Opening — latest at the bottom

| Rule                                             | Where it lives                                        |
| ------------------------------------------------ | ----------------------------------------------------- |
| Open at the **absolute bottom** (latest content) | `MessageScrollerProvider defaultScrollPosition="end"` |

**Why the bottom, not last-anchor.** Peer threads are not Q&A turns. Pinning the sender’s own message to the top of the viewport hides newer
context and fights the expectation that “latest is at the bottom.”

### Scroll — no turn anchors

| Concern        | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| `scrollAnchor` | **Never** — not on own messages, peer messages, milestones, or banners |

New own or peer messages rely on shared `autoScroll` while the reader is at the live edge. Jump-to-latest when they have scrolled up.

### Composition

```text
MessageScrollerProvider (defaultScrollPosition="end", scrollEdgeThreshold=64, autoScroll)
└── MessageScroller
    ├── MessageScrollerViewport
    │   └── MessageScrollerContent   ← every MessageScrollerItem is a *direct* child
    │       ├── MessageScrollerItem (presence banner below md, no scrollAnchor)
    │       ├── MessageScrollerItem (date marker, no scrollAnchor)
    │       ├── MessageScrollerItem + ChatMessage (no scrollAnchor)
    │       └── …
    └── MessageScrollerButton direction="end"  ("Jump to latest")
```

Surfaces: `BookingRequestOfferChat`, `SupportRequestChat`. Presence banner layout: see [Layout](#layout--paddings-max-widths-breakpoints).
Product behaviour: [booking-offer-chat.md](../features/booking-offer-chat.md), [support-requests.md](../features/support-requests.md).

---

## Anti-patterns

- **Hand-rolled `scrollIntoView` on new messages.**
- **A home-grown `isAtBottom` toggle.**
- **Using assistant `last-anchor` / `scrollAnchor` on human (offer / support) threads.**
- **Using human `end` open without anchors on assistant threads** (loses turn focus).
- **Typing indicator dots without a shimmer'd pending row.** (assistant)
- **Hover-only copy / TTS on assistant rows (or on touch).**
- **Full-page scroll (transcript scrolls with the page).**
- **`aria-live="assertive"` on the streaming region.**
- **Bubbled assistant markdown.**
- **Avatars on own / assistant / system / milestone rows** — only peer (`!isOwn`) `ChatMessageUser` streaks show avatar (last) + name
  (first, inside bubble).
- **Bare muted text for offer domain events** — use the centered milestone pill (tone → icon → soft StatusBadge-density surface).
- **Uppercase / abbreviated / hairline-flanked date markers** — use `ChatDateMarker` (muted pill, Today / Yesterday / long date).
- **A refetch on send.** (assistant streaming path)
- **Composer that doesn't wrap `MessageComposer`.**
- **Raw tool ids in the transcript pill** — use `toolDisplay`; the id belongs in the inspector.
- **`scrollbar-width: none` on the transcript viewport.**
- **Wrapping scroll items in a date `<section>` or `aria-live` region.**
- **`scrollAnchor` on every row** — assistant: only the user message that starts a turn; human: never.

## How to add a new chat surface

1. Decide **assistant vs human** transcript mode. Assistant uses turn + parts (`ChatMessage`); human offer/support use `HumanChatMessage`.
2. For assistant: add the GraphQL query / subscription (initial query + `chatTurnUpdates` — see
   [`architecture/chat.md`](../architecture/chat.md)). For human: use the surface’s existing mutation / live update path.
3. Wrap `MessageComposer` (via `ChatComposer` when applicable). **Do not** import a bare `<textarea>`.
4. Lay the surface out as `grid grid-rows-[1fr_auto]` — transcript on top, composer at the bottom. Pass
   `ChatTranscriptShell mode="assistant" | "human"`.
5. Document surface-specific product behaviour under `docs/features/` and keep presentation rules here.

## File locations

| Concern                          | File                                               |
| -------------------------------- | -------------------------------------------------- |
| This doc                         | `docs/styles/chat.md`                              |
| Composer primitive               | `src/web/components/MessageComposer.tsx`           |
| Chat composer base               | `src/web/chat/ChatComposer.tsx`                    |
| Shared row atoms                 | `src/web/components/chat-message/shared.tsx`       |
| Streaming markdown               | `src/web/components/AssistantMarkdown.tsx`         |
| Thoughts disclosure              | `src/web/components/AssistantReasoning.tsx`        |
| Live-updates hook                | `src/web/chat/useChatTurnLiveUpdates.tsx`          |
| Motion rules for composer states | `docs/styles/motion.md`                            |
| Foundation / persistence         | `docs/architecture/chat.md`, `chat-persistence.md` |
| Chat surfaces index              | `docs/features/chat.md`                            |
