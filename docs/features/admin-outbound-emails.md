# Admin outbound emails

Operators audit transactional email sends, delivery lifecycle, and Resend quota, with links to users and related purchases.

## Behavior

Admins inspect outbound email under `/admin/outbound-emails` (overview + list + detail). Sidebar sub-link for the list.

### Overview — `/admin/outbound-emails`

- **Resend quota** — live monthly `used / limit` (progress bar, reset time). Daily quota only when Resend returns a non-null daily limit
  (free tier). Quiet empty state when `EMAIL_TRANSPORT=console` or the usage API fails, with a link to the Resend dashboard.
- Counts by lifecycle (total, failed, opened, bounced, pending) and a creation bar chart. Distribution cards deep-link into the list with
  `lifecycleStatus` preselected (Total clears the filter).
- Date range in the URL (`from` / `to`, default previous calendar month start through current month end); daily buckets zero-filled.
- Section card links to the list (also in the sidebar).

### List — `/admin/outbound-emails/list`

Search recipient or subject. Tabs filter by delivery lifecycle (failed / opened / bounced / pending; omit = all) and by purpose (gift card
purchased, auth OTP, email-address update confirm; omit purpose tab = all). Sortable table, pinned bottom pagination (`page` / `pageSize`;
default 25). Status badges from lifecycle (failed / sent / opened / pending). Row or chevron → detail.

### Detail — `/admin/outbound-emails/<id>`

Full timestamps, purpose, to/from, subject, provider ids, failure reason. Download send-time attachments when present (e.g. gift-card
receipt PDF). Link to attributed user and to related gift card when applicable.

### Related surfaces

Gift-card admin detail lists related emails. User detail **emails** tab lists sends for that account.

### Ops alert

Twice daily (00:00 and 19:00 Europe/Berlin) a recurring job checks Resend usage and posts to the ops-alerts Slack channel only when monthly
(or free-tier daily) quota is at risk: used ≥ limit, ≥ 80% used, or linear projection through reset would meet/exceed the limit. Silent when
healthy or when email transport is console.

## Decisions

### Alternatives considered

| Topic            | Choice                                                         |
| ---------------- | -------------------------------------------------------------- |
| Purpose filter   | Required purpose list in API; UI tabs pass one or all purposes |
| Status display   | Derived badges on list; full timestamps on detail              |
| Gift-card emails | Shared list criterion with related entity type + id            |
| Quota source     | Live Resend `usage.get()` on overview (no local cache in v1)   |
| Hub hierarchy    | Overview + list + detail (matches logs / AI generations)       |

### Chosen

Overview + list + detail with purpose tabs, lifecycle facet counts, Resend quota hero, and shared admin outbound-email queries; attachments
exposed on detail when stored.

## Implementation

| Piece       | Location                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Overview UI | `AdminOutboundEmailsOverviewPage` + `AdminOverviewNavCard` / `AdminOverviewStatCard` / chart     |
| List UI     | `AdminOutboundEmailsPage` + columns / shared data table                                          |
| Detail      | `AdminOutboundEmailPage`                                                                         |
| Queries     | `adminOutboundEmailFindMany`, counts, creations, find one; `adminResendUsage` → `email.usageGet` |
| Mapper      | `toGqlAdminOutboundEmail`                                                                        |
| Runtime     | `serverRuntime.email.send` / `usageGet`                                                          |
| Nav         | Catalog slug `outbound-emails`; section helper `adminOutboundEmails.ts`                          |
| Alert job   | `resend-usage-slack-alert` (see [jobs.md](../architecture/jobs.md))                              |

GraphQL: `outboundEmails(criterion)` / counts — search on to/subject, purposes, optional lifecycle statuses, optional user ids, optional
related entity, sort, paginate; `outboundEmailCreations(range, granularity)`; `outboundEmail(id)` with attachments via join table;
`resendUsage` (nullable).

See [outbound-email.md](../architecture/outbound-email.md), [admin-users.md](./admin-users.md),
[gift-card-purchase.md](./gift-card-purchase.md), [slack-notifications.md](./slack-notifications.md).
