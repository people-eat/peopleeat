# Customer shell

Signed-in customers get a persistent floating-sidebar workspace for account, booking, gift cards, and support under `/profile/*`.

## Behavior

Visiting `/profile`, `/profile/booking-requests`, nested booking-request and offer routes (including checkout), `/profile/gift-cards`,
`/profile/support-requests`, or `/profile/account` as a customer shows:

- **Header:** peopleeat logo linking to the public landing page.
- **Nav:** Overview at `/profile`, Booking requests, Gift cards, Support (with a `NotificationBadge` when support chat is unread — see
  [status-messaging.md](../styles/status-messaging.md)).
- **Footer:** Account at `/profile/account`. When the user is also an admin, an Admin link appears above Account.
- **Main pane header:** sidebar trigger + path breadcrumbs (no leading “Profile”) + accent assistant trigger on the right (soft orange pill,
  one-shot border orbit on mount; closed by default). Compact on mobile (`h-12` / tighter content `pt`) so the trail sits close to the body
  — see [theme.md](../styles/theme.md#workspace-chrome-density). Hidden when `ASSISTANT_CUSTOMER` is off — see
  [admin-feature-toggles.md](./admin-feature-toggles.md).
- **Assistant rail:** same floating right sidebar / full-screen mobile sheet as the cook shell — same toggle gate as the trigger;
  `/profile/assistant` redirects to `/profile` when off. See [assistant-sidebar.md](./assistant-sidebar.md),
  [assistants.md](./assistants.md), [cook-shell.md](./cook-shell.md).
- Cook-only `/profile/*` sub-routes show access denied without customer sidebar chrome. Cook vs customer shells lazy-split per
  [cook-shell.md](./cook-shell.md).

Mobile: the left nav sheet closes when the route changes after a nav selection.

### Overview (`/profile`)

Customer home answers “what should I do next?”, not a second booking-request inbox:

1. **Attention** (max three): offers waiting for review → payment due → unread offer chat → upcoming / actionable discovery call → missing
   review. Each alert has one CTA into request detail, offer chat (`?tab=chat`, since Offer is the default tab), call/testimonial, or
   checkout. When the first Attention item targets the same booking request as Next dinner (`request` / `offer` / `checkout`), it is
   **folded into that booking-request card**: short `StatusBadge` + primary CTA/link overridden to the Attention target. Multi-request
   Attention (`kind: requests`) stays standalone.
2. **Create booking request:** primary empty-state alert when the customer has no requests; quiet secondary row when they have requests and
   nothing needs attention; omitted while Attention is showing so accept/pay wins.
3. **Next dinner:** soonest active request rendered with `CustomerBookingRequestCard` (same card as `/profile/booking-requests`). “View all”
   when more than one active request. Full grids stay on `/profile/booking-requests`.
4. **All clear** when Attention is empty and at least one request exists.

Booking journeys under this shell are documented in [booking.md](./booking.md), [booking-request-create.md](./booking-request-create.md),
[booking-offers.md](./booking-offers.md), [booking-offer-chat.md](./booking-offer-chat.md), and [booking-payment.md](./booking-payment.md).

### Breadcrumbs

Breadcrumbs answer “where within the customer profile?”, not “are you in profile?”. Examples:

- `/profile` → Overview
- `/profile/booking-requests` → Booking requests
- `/profile/booking-requests/<id>` → Booking requests › {occasion}
- `/profile/booking-requests/<id>/edit` → Booking requests › {occasion} › Edit
- `/profile/booking-requests/<id>/offers/<offerId>` → Booking requests › {occasion} › {cook display name}
- `/profile/booking-requests/<id>/offers/<offerId>/checkout` → Booking requests › {occasion} › {cook display name} › Checkout
- `/profile/gift-cards` → Gift cards
- `/profile/support-requests` → Support
- `/profile/support-requests/create` → Support › New support request
- `/profile/support-requests/<id>` → Support › {subject}
- `/profile/account` → Account

## Decisions

### Alternatives considered

| Option                                        | Pros                                     | Cons                            |
| --------------------------------------------- | ---------------------------------------- | ------------------------------- |
| Keep simple full-bleed customer profile       | Minimal chrome                           | No persistent nav to account    |
| Floating sidebar matching cook/admin (chosen) | Same workspace pattern; account in inset | Extra chrome for a thin catalog |

### Chosen

Floating sidebar + nested assistant pane in profile layout when the account has no cook membership. Allowed customer routes include account,
booking requests (full subtree), gift cards, and support. Other `/profile/*` paths stay cook-gated. Child pages own only main content.

## Implementation

- Gate unchanged for unsigned sessions (redirect to sign-in). Cook vs customer keyed off nullable cook membership.
- `SidebarInset` is a `<div>` so pages do not nest `<main>` landmarks ([conventions](../conventions.md)).
- Customer catalog: `src/web/pages/profile/customerCatalog.ts`.
- Breadcrumbs: `CustomerBreadcrumbs`.
- Mobile close: `CustomerSidebar` closes the mobile sheet when `pathname` changes.
- Assistant: shared `ProfileAssistantPane` / `ProfileAssistantSidebar` with the cook shell; header AI entry is `AssistantTriggerButton`.
  Chat stack not wired yet — see [assistants.md](./assistants.md).
- Customer inset matches cook: viewport-locked with scrollable content pane (document gutters off; inset uses one-sided
  `scrollbar-gutter-stable` — [theme.md](../styles/theme.md)). Path changes reset that pane (and pinned-footer bodies) to the top —
  [theme.md — Route scroll reset](../styles/theme.md#route-scroll-reset). Offer chat fills the pane with overflow breakout so its composer
  stays pinned to the shell bottom ([styles/chat.md](../styles/chat.md)).
- **Pinned action footers:** booking-request detail uses `ProfilePinnedFooterLayout` for edit (or **Change participants** after dual accept
  when the amendment toggle is on) / cancel; booking-request edit uses it for Cancel / Save; customer offer detail uses it for Accept on the
  Offer tab (same pattern as cook meal/menu view). Do not use CSS sticky for shell action bars — see
  [conventions](../conventions.md#profile-pinned-action-footers).
- Admin footer link: `isAdmin` from the profile loader.
- Support nav badge: `CustomerSidebar.graphql` → `User.attentionCounts.supportRequestUnreadCount` (`userAttentionCountsFindOne`), live via
  `userUpdates`. See [attention.md](../architecture/attention.md).
- Overview model: `User.attention` (`userAttentionFindMany` → `userAttentionDerive`) supplies the ranked items; wording, tone, and card
  badge labels come from `src/shared/attentionCopy.ts`. `src/web/pages/profilePageCustomerOverview.ts` attaches routes, caps at three, folds
  into Next dinner, and picks the create mode → `ProfilePageCustomer` (Next dinner uses `CustomerBookingRequestCard`). See
  [attention.md](../architecture/attention.md).
- Key files: `src/web/pages/profile/ProfileLayout.tsx` (`CustomerShell`, `ProfileAssistantPane`), `src/web/components/CustomerSidebar.tsx`,
  `CustomerBreadcrumbs.tsx`, `CustomerBookingRequestCard.tsx`, `AssistantTriggerButton.tsx`, `ProfileAssistantSidebar.tsx`,
  `ProfilePinnedFooterLayout.tsx`, `customerCatalog.ts`, `ProfilePageCustomer.tsx`.

See also [profile.md](./profile.md), [account.md](./account.md), [cook-shell.md](./cook-shell.md), and [admin-shell.md](./admin-shell.md).
