# Admin promo codes

Operators create global fixed-amount discount codes, extend or expire them, and see which booking requests currently apply a code.

## Behavior

Admins manage promo codes under `/admin/promo-codes` (list + create + detail), with sidebar list/create links.

### List — `/admin/promo-codes`

Search redeem code. Sortable table, pinned bottom pagination bar with per-page size (`page` / `pageSize`; default 25). Row or chevron →
detail. Header **Create** and sidebar open create.

### Create — `/admin/promo-codes/create`

Redeem code, amount (euro presets + free text stored as cents), optional minimum customer total, expiration date/time (defaults to end of
day one calendar month ahead). Creates **global** codes only. Scoped win-back codes are created by the customer cancel flow, not here.
Success → detail.

### Detail — `/admin/promo-codes/<id>`

Tabs: **general** (read-only id, code, amount, minimum, scope global vs request-bound, active/expired, created), **expiration** (datetime
save, **Expire now**), **usage** (booking requests that currently apply this code, links to admin booking detail). Redeem code and amount
are not editable after create.

### Booking-scoped (churn) codes

Some codes bind to a single booking request (cancel win-back: fixed amount, ~30 days, idempotent per request). Apply rules:

- Scoped codes apply only when the checkout/request id matches — see [booking-payment.md](./booking-payment.md) and
  [booking-request-create.md](./booking-request-create.md).
- Public discount preview excludes scoped codes so they never appear in generic form previews.
- Partner promo assignment rejects scoped codes; expired partner promos hidden on public surfaces — [partners.md](./partners.md).

## Decisions

### Alternatives considered

| Option                              | Pros                      | Cons                             |
| ----------------------------------- | ------------------------- | -------------------------------- |
| Create dialog on list               | Fewer routes              | Cramped; inconsistent with users |
| Dedicated create route (chosen)     | Room for validation       | Extra route                      |
| Keep request-scoped column (chosen) | Churn win-back + scoping  | Extra catalog complexity         |
| Hard-delete codes                   | Simple cleanup            | Loses audit trail                |
| Expire via datetime update (chosen) | Extend + expire-now       | Expired rows still listed        |
| Editable code/amount after create   | Full edit                 | Unsafe after distribution        |
| Usage via apply FK (chosen)         | Shows current redemptions | Not full historical ledger       |

### Chosen

List + create + detail with expiration-only admin mutations; UUID keys and cent amounts; scope column; usage tab from requests that
reference the code today.

## Ideas

- Active / expired filter tabs on list.
- Historical redemption ledger beyond current apply FK.

## Implementation

| Layer    | Notes                                            |
| -------- | ------------------------------------------------ |
| DB       | `PromoCodes` + optional `bookingRequestId`       |
| SDL      | Admin promo types, create/update mutations       |
| Commands | `adminPromoCodeCreate`, `adminPromoCodeUpdate`   |
| Queries  | find many / counts / find one + criterion utils  |
| UI       | list, create, detail tabs, nav helpers           |
| Routes   | `/admin/promo-codes`, `/create`, `/$promoCodeId` |

Customer churn: `UserMutation.bookingRequestChurnPromoCodeCreate`. Admins apply or clear codes on a request via
`AdminMutation.bookingRequestDiscountUpdate` (see [admin-booking-requests.md](./admin-booking-requests.md)). GraphQL admin:
list/count/detail; create/update publish admin updates.

See [admin-booking-requests.md](./admin-booking-requests.md), [booking-request-create.md](./booking-request-create.md),
[booking-payment.md](./booking-payment.md).
