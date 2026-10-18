# WhatsApp

Customers and cooks get lifecycle updates on WhatsApp when we have an E.164 phone (always alongside email). Concierge handles inbound
threads in the admin inbox, including media and quick-reply reactions.

## Behavior

### Customer / cook

- Lifecycle templates when `Users.phoneNumber` is E.164 with a leading `+` / country code (normalized at send; Meta gets digits-only),
  including deep-link URL buttons where approved:
  - Customer: request created, new offer, menu update, offer accepted, payment confirmed, pull-payment announcement, request canceled,
    offer-chat unread reminder, 48h reaction reminder (quick-reply template)
  - Cook: new request notify, request updated, offer accepted, request canceled, offer-chat unread reminder
  - Call slots (both parties): create, confirm, cancel/decline, 60‑minute reminder
- Can message the business WhatsApp number (public `wa.me` CTAs and Meta Cloud API share the same number).
- Preferred communication still collected; it does **not** turn WhatsApp off when a phone exists.

### Admin

- `/admin/whats-app-chats` — unread-first card grid (shared admin link-card chrome): profile picture (peopleeat user when matched, else
  initials), name/phone + two-line last-message preview, right column with messenger-style relative time above a green unread
  `NotificationBadge`; search (phone / WA display name / user), pinned bottom pagination (`page` / `pageSize`), live updates, sidebar unread
  badge.
- `/admin/whats-app-chats/<id>` — human transcript with attachments + delivery ticks; free-form reply only inside the Meta 24h
  customer-service window; mark read on open (admin unread + Meta blue-tick). Nested transcript owns the pane scroll under
  `AdminPinnedFooterLayout` `contentScroll={false}` (chrome breakout; header keeps `px-4`, chat wrapper does not, so the
  scrollbar sits on the pane edge).
- User detail **WhatsApp** tab lists that user’s conversations.
- Inbound Slack mirror on `SLACK_CHANNEL_WHATSAPP_MESSAGES`; known reaction quick-replies also post on the booking Slack thread.

### Ops prerequisite

Before `WHATSAPP_TRANSPORT=meta` in Coolify: subscribe the Meta app webhook to `messages` + `message_statuses`, confirm Meta template
**names** match `whatsappTemplateNameByPurpose` in `src/server/domain/whatsapp.ts` (predecessor keys such as
`user_booking_request_create__for_user`, not reinvented slugs), and set secrets (including Slack WhatsApp channel when
`SLACK_TRANSPORT=slack`). Local/dev uses `console` (no phone delivery). Purposes mapped to `null` are intentionally not sent until a Meta
template exists.

Feature toggles (admin `/admin/feature-toggles`, missing = off):

- `WHATSAPP_ENGLISH_TEMPLATES` — enable only after EN templates are approved in WhatsApp Manager; until then EN recipients fall back to Meta
  language `de`
- `WHATSAPP_WEBHOOK_SIGNATURE_VALIDATION` — enable once Meta `X-Hub-Signature-256` / app secret is confirmed; while off, POST webhooks skip
  signature verification. If this is on and `WHATSAPP_APP_SECRET` does not match the Meta app secret, Meta POSTs return `400` and inbound
  never lands in admin (look for `whatsapp webhook: POST rejected (invalid signature…)` in Admin Logs / Coolify logs)

Temporary test mirror: on Meta transport, the primary webhook host fire-and-forget forwards each POST (body + `X-Hub-Signature-256`) to
`https://demo.people-eat.com/api/webhooks/whatsapp`. Skipped when this deploy already is demo (`WEB_PAGE_URL` host). Demo needs the same app
secret (or signature validation off) and should not be the sole Meta callback if you still want prod to receive events.

## Decisions

### Alternatives considered

| Topic           | Choice                                          |
| --------------- | ----------------------------------------------- |
| Channel model   | Dedicated conversations (not SupportRequests)   |
| Send policy     | Always email + WhatsApp when phone is E.164     |
| Free-form reply | Only inside 24h window                          |
| Cook notifies   | Included when cook has E.164 phone              |
| Media           | Inbound → FileUploads; admin outbound text-only |

### Chosen

Meta Cloud API + audit table + Concierge inbox, mirroring outbound-email / support-request patterns.

## Ideas

- Admin outbound media attach
- Richer AdminAssistant-style tooling on the Concierge surface (history import from ExternalMessages ships via go-live ETL)
- WhatsApp contact avatars (not available via Meta Cloud API; peopleeat profile pictures only)

## Implementation

| Area      | Notes                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------- |
| Provider  | `src/server/whatsapp/whatsappCreate.ts`, `ServerRuntime.whatsapp`                                     |
| Domain    | `src/server/domain/whatsapp.ts`                                                                       |
| Tables    | `WhatsAppConversations`, `WhatsAppMessages`, `WhatsAppMessageAttachments`, `OutboundWhatsAppMessages` |
| Webhook   | `src/routes/api/webhooks/whatsapp.ts`, `whatsappWebhookApply`, `whatsappWebhookDemoForward`           |
| Lifecycle | `bookingRequestLifecycleWhatsApp.ts`, `bookingRequestOfferCallSlotWhatsApp.ts`                        |
| Reaction  | `bookingRequestReactionReminder` job + `bookingRequestReactionReminderSchedule` (48h, offer signals)  |
| Slack     | `src/server/slack/whatsappSlack.ts`, channel `whatsAppMessages`                                       |
| Admin GQL | `whatsAppConversations*`, `whatsAppMessageCreate`, `whatsAppConversationUnreadCountReset`             |
| Admin UI  | `AdminWhatsAppChatsPage`, `AdminWhatsAppChatPage`, user tab, sidebar badge                            |
| Docs      | [architecture/whatsapp.md](../architecture/whatsapp.md)                                               |

See [admin-shell.md](./admin-shell.md), [admin-users.md](./admin-users.md), [booking-request-create.md](./booking-request-create.md),
[slack-notifications.md](./slack-notifications.md), [styles/chat.md](../styles/chat.md).
