# Attention (server-derived badges and to-dos)

## Context

"What needs my attention?" rules decide sidebar badge counts, overview Attention cards, offer-page banners, and (separately) reminder jobs.
They used to live in web-only modules that derived them from large owned-data selections — every offer with call bookings, the full open
pool just to count it. A native client would have to fetch the same payloads and re-implement the same rules, and server reminder jobs
already re-implement similar checks in their own SQL. Three copies drift.

## Decision

The **server decides** what needs attention and returns **semantic facts** — counts, kinds, target ids, timestamps. Clients only **present**
them: copy, icons, routes, layout.

| Lives on the server                                     | Lives in `src/shared`                              | Lives on the platform (web / native)         |
| ------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------- |
| Which items apply, ordering, counts, target ids         | Bilingual wording per kind (`attentionCopy.ts`)    | Route targets, item limits, folding, styling |
| Pure rules in `src/server/domain/` (unit-tested, no DB) | Tone and short badge label per kind (`StatusTone`) | Icons, badges, banners                       |

Rules:

- Attention fields are **own-user only**: `User.*` attention fields return `null` for a foreign parent; `Cook.*` fields are only reachable
  through the session's own `User.cook`.
- Shared membership logic is extracted, not copied — e.g. `cookBookingRequestPoolRowsFind` backs both `Cook.bookingRequests` and
  `Cook.attentionCounts.bookingRequestPoolCount`, so the badge always matches the list.
- Freshness rides `userUpdates` ([state-synchronization.md](./state-synchronization.md)). Any write that changes an attention input must
  publish `userUpdates` for every affected user. Attention fields are recomputed on each push, so they must stay cheap (aggregates and flat
  selects, no hydration).
- Writes that can change **pool membership** (create when auto-approved, cancel, expire, dual accept, address / expiry edits) call
  `bookingRequestPoolCooksPublish`, which pushes to every cook eligible for the request before and after the write using the same
  `cookIsEligibleForBookingRequestPool` rule as the pool list (skipping users the caller already published).
- Rules run in `src/server/domain/` as pure functions over plain inputs; queries only load rows and reuse the existing status derivations
  (`bookingRequestStatusDerive`, `bookingRequestOfferStatusDerive`, `cookStripeStatusDerive`), so attention and lists agree on status.
- Fields are additive and named by meaning (`bookingRequestOfferUnreadCount`), not by UI (`sidebarBadge`), so native app-icon badges and
  push can reuse them.

### Shipped

| Field                  | Values                                                                              | Query                         | Rule                             |
| ---------------------- | ----------------------------------------------------------------------------------- | ----------------------------- | -------------------------------- |
| `Cook.attentionCounts` | `bookingRequestPoolCount`, `bookingRequestOfferUnreadCount`, `walletNeedsAttention` | `cookAttentionCountsFindOne`  | `cookWalletNeedsAttentionDerive` |
| `User.attentionCounts` | `supportRequestUnreadCount`                                                         | `userAttentionCountsFindOne`  | SQL sum                          |
| `User.attention`       | `[UserAttentionItem]` by `UserAttentionKind`, highest priority first                | `userAttentionFindMany`       | `userAttentionDerive`            |
| `Cook.attention`       | `[CookAttentionItem]` by `CookAttentionKind`, highest priority first                | `cookAttentionFindMany`       | `cookAttentionDerive`            |
| `Cook.onboardingSteps` | `[CookOnboardingStep]` in display order                                             | `cookOnboardingStepsFindMany` | `cookOnboardingStepsDerive`      |

Overview items carry ids and timestamps, never copy: `count` (requests or unread messages, otherwise 1), `bookingRequestId` /
`bookingRequestOfferId`, `occasion`, call `startAt` / `endAt`, `customerDisplay`. Ordering and tie-breaks (soonest request first; first
offer with the most unread; a call the customer must answer wins over earlier pending / confirmed calls) are defined and tested in the
domain rules. The server returns every applicable item; how many to show (customer web: three) and whether to fold one into a card stay on
the platform.

Discovery-call ranking (`cookCallSlotBookingNextStepPick`: response needed → pending → confirmed) and the call time window wording live in
`src/shared/cookCallSlotBookingStatus.ts`, so the server rule and the web offer-card hints share one definition.

### Planned (in order)

1. Per-offer attention on customer / cook offers (deposit due, call needs response, changes to confirm) — replaces `callBookingOverviewHint`
   and inline banner conditions.
2. Reminder jobs call the same domain rules at send time and skip resolved items; a single total backs native app-icon badges.

## Alternatives considered

- **Keep rules on the client, share them via `src/shared`.** Removes the web/native copy but not the server-job copy, and clients still
  download whole lists to count them.
- **Server returns localized strings.** One less client module, but couples the API to copy, ignores per-platform wording length, and makes
  copy edits API changes.
- **One generic `attention(role)` field on `User`.** Fewer types, but mixes role-scoped auth (`Cook` is already the cook namespace) and
  produces looser codegen unions.

## Consequences

- Sidebar subscriptions shrink to a handful of integers; the cook overview no longer selects offers, call bookings, meal / menu counts, or
  profile fields, and `ProfilePage` needs no query variables (the 14-day call window is computed on the server).
- Time-based items (upcoming call, review due) still go stale between pushes, as before. Clients hide past timestamps at render; jobs that
  already run at those moments should publish `userUpdates`.
- Pool-membership writes fan out one extra eligibility query (all cooks + affinity rows for the request) per write.

## Key files

- Fields:
  `src/server/queries/{cookAttentionCountsFindOne,userAttentionCountsFindOne,userAttentionFindMany,cookAttentionFindMany,cookOnboardingStepsFindMany}.ts`
- Rules: `src/server/domain/userAttention.ts`, `src/server/domain/cookAttention.ts`, `src/server/domain/cook.ts`
  (`cookWalletNeedsAttentionDerive`)
- Wording: `src/shared/attentionCopy.ts`, `src/shared/cookCallSlotBookingStatus.ts`
- Pool: `src/server/utils/cookBookingRequestPoolRowsFind.ts`, `src/server/utils/bookingRequestPoolCooksPublish.ts`
- Web: `src/web/components/CookSidebar.graphql`, `src/web/components/CustomerSidebar.graphql`, `src/web/pages/ProfilePage.graphql`,
  `src/web/pages/profilePageCustomerOverview.ts`, `src/web/pages/profilePageCookOverview.ts`
