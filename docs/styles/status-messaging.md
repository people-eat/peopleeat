# Status messaging

Shared visual language for attention, confirmation, and guidance across peopleeat — nav badges, list labels, and page banners.

## Principle

**One tone → one icon → one soft surface.** Status should be recognizable at a glance and stay readable on selected / hovered chrome. Never
encode “needs attention” as primary charcoal chrome with a bare `!` — that washes out on active sidebar rows and reads as UI chrome, not
urgency.

## Tones

| Tone      | When to use                                              | Icon                | Banner surface                    | Icon chip                       |
| --------- | -------------------------------------------------------- | ------------------- | --------------------------------- | ------------------------------- |
| `info`    | Neutral guidance, pending approval, “not started yet”    | `InfoIcon`          | `bg-blue-100 border-blue-400`     | `bg-blue-200 text-blue-600`     |
| `success` | Completed / ready / confirmed                            | `CircleCheckIcon`   | `bg-green-100 border-green-400`   | `bg-green-200 text-green-600`   |
| `warning` | Incomplete, action still required, recoverable attention | `TriangleAlertIcon` | `bg-yellow-100 border-yellow-400` | `bg-yellow-200 text-yellow-600` |
| `error`   | Failure, blocking problem, destructive outcome           | `CircleXIcon`       | `bg-red-100 border-red-400`       | `bg-red-200 text-red-600`       |

Keep these Tailwind stops in `src/web/components/base/status.ts` — do not remap status messaging through brand `--accent` / `--info` /
`--success` tokens (those remain available for other UI). Brand orange stays for emphasis and focus rings; status yellow is the attention
hue for banners and chips. Separating status hues from brand tokens keeps “needs attention” readable next to primary chrome.

## Components

| Affordance          | File                                             | Use when                                                                                           |
| ------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `StatusIcon`        | `src/web/components/base/status-icon.tsx`        | Circular soft chip; building block for the other two                                               |
| `StatusBadge`       | `src/web/components/base/status-badge.tsx`       | Compact: nav attention (icon-only + `label`) or list/card labels (icon + short text)               |
| `NotificationBadge` | `src/web/components/base/notification-badge.tsx` | Unread count bubble (red disc + white bold numeral)                                                |
| `StatusAlert`       | `src/web/components/base/status-alert.tsx`       | Section / page banners with optional title, body, and action slot                                  |
| `Alert`             | `src/web/components/base/alert.tsx`              | Low-level shadcn primitive; variants `info` / `success` / `warning` / `error` share the same tones |
| `BookingStatusPill` | `src/web/components/BookingStatusPill.tsx`       | Booking request / offer lifecycle labels only — soft yellow/blue/green/purple/red palette          |

Shared maps (`statusIcons`, surface classes) live in `src/web/components/base/status.ts` — keep tones and classes there so Sonner icons and
future surfaces can stay in sync.

### Choosing the right affordance

1. **Nav / dense chrome** → `StatusBadge` icon-only with bilingual `label` (aria + title). Own fill colours so parent active-text rules
   cannot invert the glyph.
2. **Unread counts (cards + sidebar)** → `NotificationBadge` with bilingual `label`. Cards use default `placement="corner"` (full disc,
   overhangs `-top-2 -right-2`) on a `relative` parent; sidebar rows nest `placement="inline"` (compact disc) inside `SidebarMenuBadge`
   (neutralize host text colour the same way as `StatusBadge`). Corner overhang needs scrollport paint room — profile/admin content panes
   keep full `p-4` (do not zero `pt-0`) so the disc is not clipped at the top.
3. **Row / card meta** → `StatusBadge` with a short label (`Incomplete`, `Pending`).
4. **Explain a state** → `StatusAlert` with title + one short sentence. Put buttons in the `action` slot or beside the alert, not inside the
   title.
5. **Transient feedback after an action** → Sonner toast (already uses the same Lucide set). Do not replace toasts with banners.
6. **Booking request / offer lifecycle** → `BookingStatusPill` + `bookingRequestStatusClassName` / `bookingRequestOfferStatusClassName` (and
   role-aware label helpers). Do not remap these through `StatusTone`.

`Badge` (neutral meta: draft/published, non-unread counts) stays for non-status labels. Use `variant="outline"` for draft/published on cards
and detail pages — `variant="secondary"` is white (`--secondary`) and disappears on `bg-card`. Do not stretch `Badge variant="destructive"`
or brand `--accent` into unread bubbles — use `NotificationBadge`.

## Rules

- Always pair icon-only badges with an accessible `label`.
- Status surfaces use the shared maps in `status.ts` (blue / green / yellow / red). Do not invent one-off status colours outside those maps.
  Booking lifecycle pills keep their own soft palette (see below) — similar hues, separate maps.
- StatusIcon / StatusBadge / NotificationBadge colours are owned by the component. When nesting inside `SidebarMenuBadge`, neutralize the
  host text colour (`bg-transparent … peer-data-[active=true]/menu-button:text-transparent`) so peer active styles cannot wash out the chip
  or red unread disc.
- `StatusAlert` uses `role="status"` for info/success/warning and `role="alert"` for error.
- `StatusAlert` centers the icon with short title-only or body-only copy; keep top alignment when title + body are both present. Title and
  body share one copy column (`gap-0.5`, `leading-snug`) so the `size-8` icon never inflates the title/body gap the way separate grid rows
  would. The `action` slot is a sibling of that copy column: stacked under the copy on small viewports, trailing on the right from `sm`
  (`sm:flex-row sm:items-center`).
- `AlertDescription` is block flow (`space-y-1`), not CSS grid — so inline markup (e.g. a semi-bold price inside a sentence) stays on one
  flowing line. Wrap multi-paragraph bodies in `<p>` tags when you need vertical rhythm.
- Keep copy calm and specific. Prefer “1 course is incomplete” over generic “Warning”. Broader voice rules: [copy.md](./copy.md).
- No motion on status chips or banners by default — they answer “what’s wrong / ready?” without animation (see [`motion.md`](./motion.md)).

## Booking lifecycle pills

Marketplace booking request and offer statuses use a dedicated soft pill palette and role-aware labels (admin / customer / cook). Maps live
in:

- `src/web/components/bookingRequestStatus.ts`
- `src/web/components/bookingRequestOfferStatus.ts`
- `src/web/components/adminBookingRequestOfferStatus.ts`

| Colour                          | Typical statuses                                         |
| ------------------------------- | -------------------------------------------------------- |
| `bg-yellow-100 text-yellow-700` | Waiting / cook must confirm / menu changes requested     |
| `bg-blue-100 text-blue-700`     | Offers available / customer needs to accept              |
| `bg-green-100 text-green-700`   | Confirmed path (deposit / payment pull / upcoming event) |
| `bg-purple-100 text-purple-700` | Deposit pending (request) / completed                    |
| `bg-red-100 text-red-700`       | Declined / expired / canceled / alternative offer chosen |

Only statuses that exist in peopleeat’s derived booking enums are mapped.

## Current consumers

- Cook sidebar Wallet attention → icon-only `StatusBadge` (`warning`)
- Cook / customer / admin sidebar unread counts → `NotificationBadge` (`placement="inline"`) for pool review, offer unread, support unread
- Booking / support cards with unread → `NotificationBadge` (`placement="corner"`) on customer/cook/admin offer and request cards
- Menu course editor incomplete rows → labeled `StatusBadge` (`warning`)
- Menu editor section summary → `StatusAlert` (`warning`) when any course is incomplete
- Offer menu picker (`CookMenuSelectPanel`) incomplete inventory menus → separate grid below selectable menus; labeled `StatusBadge`
  (`warning`); Select button disabled
- Wallet page Stripe / approval states → `StatusAlert` (`info` / `warning` / `success`)
- Booking request / offer lifecycle → `BookingStatusPill` (customer, cook, admin list/detail/cards)
- Offer Call tab schedule section + cook `/profile/calls` appointment rows → labeled `StatusBadge` (pending warning/info, confirmed success,
  declined/canceled error)
- Email OTP dialogs (log-on / account email change) → `StatusAlert` (`info`) via `AuthEmailOtpSpamHint` (check spam/junk)

## Anti-patterns

- Charcoal primary pill with a white / inherited `!`
- One-off bordered cards that reinvent banner layout
- Remapping status banners through brand `--accent` orange (warning stays yellow so attention is distinct from brand emphasis)
- Accent / destructive `Badge` for unread counts (use `NotificationBadge`)
- Inventing ad-hoc booking status colours outside the maps above — extend the shared maps instead
- Using `StatusBadge` / `StatusTone` for booking lifecycle colours (use `BookingStatusPill` instead)
