# Admin gift cards

Operators triage gift-card purchases, payment status, and purchase analytics under `/admin/gift-cards`.

## Behavior

Admins manage gift cards under `/admin/gift-cards` (overview + list + detail; no create), with a sidebar sub-link to the list.

### Overview — `/admin/gift-cards`

Payment-status distribution (total, paid, prepared), all-time average paid purchase value, paid-purchases bar chart over a date range, top 3
occasions, and top 3 sales months. Distribution cards deep-link into the list with `status` preselected (Total clears the filter). Chart and
rankings use paid rows only (`paymentStatus = PAYED`). The chart date picker scopes only the purchases series; average, occasion, and
sales-month rankings are all-time (omit `range` on the stats fields; independent of that picker and of the 366-day chart span cap).

### List — `/admin/gift-cards/list`

Search by buyer email, recipient name, or redeem code. Tabs filter payment status. Sortable table (default created desc). Pinned bottom
pagination bar with per-page size (`page` / `pageSize`; default 25). Row → detail.

### Detail — `/admin/gift-cards/<giftCardId>`

Purchase fields, PDF links when present, related outbound emails, and **Regenerate PDFs** for paid cards (re-captures voucher + receipt;
soft-fails per file). See [gift-card-purchase.md](./gift-card-purchase.md).

Non-admins cannot access admin gift-card APIs; layout gates `/admin/*`.

## Decisions

### Alternatives considered

| Option                           | Pros                      | Cons                                |
| -------------------------------- | ------------------------- | ----------------------------------- |
| List-only at `/admin/gift-cards` | Fewer hops                | No stats hub                        |
| Hub + list (chosen)              | Matches sessions/users    | List not sidebar default            |
| Chart all payment statuses       | Includes abandoned        | Inflates purchase signal            |
| Chart paid only (chosen)         | True purchases            | Prepared not in series              |
| Rankings share chart range       | One control               | Short range collapses months to 1–2 |
| Rankings all-time (chosen)       | True top occasions/months | Not filterable by picker            |
| Second ranking date picker       | Flexible windows          | Extra chrome for rare need          |

### Chosen

Overview hub with paid purchase time series, all-time average purchase value, and all-time top-3 occasion and sales-month rankings; list at
`/admin/gift-cards/list`; detail unchanged.

## Implementation

- SDL: `AdminGiftCard`, criterion, `giftCardCreations`, `giftCardOccasionStats`, `giftCardSalesMonthStats`,
  `giftCardPaidPurchaseAverageCents` in `schema.graphqls`; `AdminMutation.giftCardPdfsRegenerate`
- Queries: find many, counts, creations, occasion stats, sales-month stats, paid-purchase average, find one
- Commands: `adminGiftCardPdfsRegenerate`
- UI: overview, list with status tabs + data table, detail page (+ regenerate PDFs)
- Routes: `gift-cards.tsx`, `gift-cards_.list.tsx`, `gift-cards_.$giftCardId.tsx`
- Nav: `adminGiftCards.ts` — [admin-shell.md](./admin-shell.md)

GraphQL: `giftCards(criterion)` — search, optional `giftCardIds`, payment statuses, sort, paginate; `giftCardsCounts`; `giftCardCreations`
(PAYED, zero-filled buckets, picker `range`); `giftCardOccasionStats` / `giftCardSalesMonthStats` (PAYED; omit `range` for all-time, take
3); `giftCardPaidPurchaseAverageCents` (PAYED all-time); `giftCard(id)`. Admin assistant list tool `adminGiftCardsFindMany` →
`admin.giftCardList` cards.

Gate: [authorization-admin.md](../architecture/authorization-admin.md).
