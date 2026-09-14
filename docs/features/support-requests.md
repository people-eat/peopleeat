# Support requests

Customers open support cases with optional booking context; admins reply, resolve, and track unread work in-app, by email, and in Slack.

## Behavior

### Customer

- `/profile/support-requests` — Hub starts with a banner (empty state or “another question?” when cases exist); banner action toggles the
  create form (optional booking link). Summary cards list below when cases exist. **Cancel** returns to the banner/list.
- Booking request detail **Support** tab — Create when none exists for that booking; otherwise one summary card (unread chip on tab when the
  case has customer unread).
- Accepted-offer page **Support** tab — Same create/summary pattern for post-accept customers.

Summary cards open `/profile/support-requests/<id>` for the chat. At most **one** support case per booking request; many general (or
booking-linked) cases per user. Create and reply accept optional attachments. Resolved chats show a short note that a reply reopens the
case. Transcript scroll uses **human** mode (open/stick at bottom —
[styles/chat.md — Human transcript mode](../styles/chat.md#human-transcript-mode)).

Customer replies on a resolved case reopen it to open. Opening chat clears that side’s unread counter. Sidebar badges sum customer unread
across cases.

### Admin

- `/admin/support-requests` — Filterable list (all / open / unread / resolved), live updates, unread-first ordering.
- `/admin/support-requests/<id>` — Chat, mark resolved, links to customer and booking.
- `/admin` overview queue lists **open** cases (live), unread-first.
- Sidebar badge counts cases with admin unread.

### Customer emails (no admin outbound mail)

| Event         | What the customer gets                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Create        | Confirmation that the case was opened                                                          |
| Admin reply   | Notification of new message (debounced — rapid admin replies coalesce within about one minute) |
| Admin resolve | Case closed notice                                                                             |

Create and resolve send immediately after the case updates. Admin reply email sends only if the customer still has unread when the debounced
job runs; opening the chat or resolving cancels a pending reply job.

Ops Slack: root message on create; thread replies for customer/admin messages and resolve —
[slack-notifications.md](./slack-notifications.md).

Booking context: [booking.md](./booking.md).

## Decisions

### Alternatives considered

| Option                                                  | Notes                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| Reuse assistant chat tables for support                 | Rejected — pollutes LLM replay; same as offer negotiation separation |
| Dedicated support tables with chat-shaped API           | **Chosen** — matches offer chat; shared UI primitives                |
| Optional booking link with at most one case per booking | **Chosen** — general + booking-scoped in one model                   |
| Inline chat on booking support tab only                 | Rejected — dedicated detail route keeps composer shell consistent    |
| Admin transactional email                               | Deferred — in-app unread, live queues, Slack                         |

### Chosen

Dedicated support request and message storage with chat-shaped GraphQL for the UI; dual unread counters; resolve lifecycle; customer
lifecycle emails; ops Slack threading.

## Implementation

- Schema: `SupportRequests` (incl. Slack references + customer reply notify job id), `SupportRequestMessages`,
  `SupportRequestMessageAttachments` → file uploads
- Domain: `src/server/domain/supportRequest.ts`; outbound email purposes in `outboundEmail.ts`
- Slack: `supportRequestSlack.ts` root/thread; wired from create / message / resolve
- Commands: user create (optional attachments), message create, unread reset (cancels pending reply job), admin resolve
- Job: `supportRequestCustomerReplyNotify` — ~1m debounce for admin→customer reply email
- Queries: user list/one, booking-request field, admin criterion list/counts/one (unread-first), messages with attachments
- Customer UI: catalog slug `support-requests`; `SupportRequestCreateForm`, `SupportRequestSummaryCard`, `SupportRequestChat` (composer
  attachments; presence header scrolls below `md`, static from `md` — same as offer chat); nav badges
- Admin UI: overview + list live via admin updates; nav badge; pinned bottom pagination (`page` / `pageSize`); detail viewport-locked like
  offer chat

Download peer auth: [file-storage.md](../architecture/file-storage.md).

See [customer-shell.md](./customer-shell.md), [admin-shell.md](./admin-shell.md), [booking-offer-chat.md](./booking-offer-chat.md),
[chat.md](./chat.md), [outbound-email.md](../architecture/outbound-email.md).
