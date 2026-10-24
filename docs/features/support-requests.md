# Support requests

Customers open support cases with optional booking context; admins reply, resolve, and track unread work in-app, by email, and in Slack.

## Behavior

### Customer

- `/profile/support-requests` — Hub starts with a banner (empty state or “another question?” when cases exist); banner action navigates to
  `/profile/support-requests/create`. Summary cards list below when cases exist.
- `/profile/support-requests/create` — Dedicated create form (optional booking link). Optional `bookingRequestId` query locks the booking;
  if that booking already has a case, redirect to the existing chat. **Cancel** returns to the hub.
- Booking request detail — End-aligned Support CTA + status pill above offers/details/voucher. CTA opens create with `?bookingRequestId=`
  when none exists, or the existing chat (unread chip) when a case exists.
- Accepted-offer page — Same stateful Support CTA beside the offer tabs (no Support tab).

Summary cards open `/profile/support-requests/<id>` for the chat. At most **one** support case per booking request; many general (or
booking-linked) cases per user. Create and reply accept optional attachments. Transcript scroll uses **human** mode (open/stick at bottom —
[styles/chat.md — Human transcript mode](../styles/chat.md#human-transcript-mode)).

Customer replies on a resolved case reopen it to open. Opening chat clears that side’s unread counter. Sidebar badges sum customer unread
across cases.

### Admin

- `/admin/support-requests` — Search (subject, id, customer name including first+last / last+first) + status select + sort (newest message,
  created at, soonest booking) + unread-first checkbox; live updates. Default sort is newest message with unread first.
- `/admin/support-requests/<id>` — Condensed chat chrome (crumbs + presence avatar linking to the customer, customer name above status,
  booking as an outlined button beside mark-resolved). Resolve is icon-only below `md`, labeled on desktop, and confirms closed-case email
  plus reopen-on-customer-message; dialog offers **resolve without notification** (no email, no customer unread bump).
- `/admin` overview queue lists **open** cases (live), unread-first then newest message.
- Sidebar badge counts cases with admin unread.

### Customer emails (no admin outbound mail)

| Event         | What the customer gets                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Create        | Confirmation that the case was opened                                                          |
| Admin reply   | Notification of new message (debounced — rapid admin replies coalesce within about one minute) |
| Admin resolve | Case closed notice (skipped when admin resolves without notification)                          |

Create and resolve send immediately after the case updates. Admin reply email sends only if the customer still has unread when the debounced
job runs; opening the chat or resolving cancels a pending reply job.

Ops Slack: root message on create; thread replies for customer/admin messages and resolve —
[slack-notifications.md](./slack-notifications.md).

Booking context: [booking.md](./booking.md).

## Decisions

### Alternatives considered

| Option                                                  | Notes                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Reuse assistant chat tables for support                 | Rejected — pollutes LLM replay; same as offer negotiation separation     |
| Dedicated support tables with chat-shaped API           | **Chosen** — matches offer chat; shared UI primitives                    |
| Optional booking link with at most one case per booking | **Chosen** — general + booking-scoped in one model                       |
| Inline chat / create on booking support tab only        | Rejected — dedicated create + chat routes keep composer shell consistent |
| Admin transactional email                               | Deferred — in-app unread, live queues, Slack                             |

### Chosen

Dedicated support request and message storage with chat-shaped GraphQL for the UI; dual unread counters; resolve lifecycle; customer
lifecycle emails; ops Slack threading.

## Implementation

- Schema: `SupportRequests` (incl. Slack references + customer reply notify job id), `SupportRequestMessages`,
  `SupportRequestMessageAttachments` → file uploads
- Domain: `src/server/domain/supportRequest.ts`; outbound email purposes in `outboundEmail.ts`
- Slack: `supportRequestSlack.ts` root/thread; wired from create / message / resolve
- Commands: user create (optional attachments), message create, unread reset (cancels pending reply job), admin resolve (`notifyCustomer`,
  default true)
- Job: `supportRequestCustomerReplyNotify` — ~1m debounce for admin→customer reply email
- Queries: user list/one, booking-request field, admin criterion list/counts/one (`sortField` / `unreadFirst`; optional
  `supportRequestIds`), messages with attachments; admin assistant list tool `adminSupportRequestsFindMany` → `admin.supportRequestList`
  cards
- Customer UI: catalog slug `support-requests`; create route `ProfileCustomerSupportRequestCreatePage` (`support-requests_.create.tsx`,
  search `bookingRequestId`); `SupportRequestCreateForm`, `SupportRequestSummaryCard` (inbox-style row: customer list uses Concierge Juliana
  avatar with a small headset chip; admin list uses the customer avatar; title, booking meta, single-line subject; status / inbox timestamp;
  unread corner badge), `SupportRequestChat` (composer attachments; presence header scrolls below `md`, static from `md` — same as offer
  chat); booking/offer detail Support CTAs; nav badges
- Admin UI: overview + list live via admin updates; nav badge; pinned bottom pagination (`page` / `pageSize`); list search params `status` /
  `sort` / `unreadFirst`; detail viewport-locked like WhatsApp chat (`AdminPinnedFooterLayout` + `SupportRequestChat` presence avatar / user
  link)
- Message selection: admin + customer detail queries use shared `HumanChatMessageFields` (includes `reactions`, even though support always
  returns `[]`) so `ChatMessageUserView` matches offer / WhatsApp chat

Download peer auth: [file-storage.md](../architecture/file-storage.md).

See [customer-shell.md](./customer-shell.md), [admin-shell.md](./admin-shell.md), [booking-offer-chat.md](./booking-offer-chat.md),
[chat.md](./chat.md), [outbound-email.md](../architecture/outbound-email.md).
