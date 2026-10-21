# WhatsApp

Customers and cooks get lifecycle updates on WhatsApp when we have an E.164 phone (always alongside email). Concierge handles inbound
threads in the admin inbox, including media, quick-reply reactions, and emoji reactions on messages.

## Behavior

### Customer / cook

- Lifecycle templates when `Users.phoneNumber` is E.164 with a leading `+` / country code (normalized at send; Meta gets digits-only),
  including deep-link URL buttons where approved. WhatsApp covers **pre-payment** discovery and negotiation; **after payment**, money and
  some closure events stay **email-only** (Meta template traffic costs money). Email still sends for every lifecycle purpose.
  - Customer (WhatsApp): request created, new offer, menu update, offer-chat unread reminder, 48h reaction reminder (quick-reply template)
  - Cook (WhatsApp): new request notify, request updated, offer accepted, offer-chat unread reminder
  - Call slots (both parties, WhatsApp): create, confirm, cancel/decline, 60‑minute reminder
  - Email only (`null` template on purpose): customer offer-accept confirm, payment confirmed, pull-payment announcement, request canceled
    (customer and cook). May add WhatsApp later if product wants those sends.
- Can message the business WhatsApp number (public `wa.me` CTAs and Meta Cloud API share the same number).
- Preferred communication still collected; it does **not** turn WhatsApp off when a phone exists.

### Admin

- `/admin/whats-app-chats` — unread-first card grid (shared admin link-card chrome): profile picture (peopleeat user when matched, else
  initials), name/phone + two-line last-message preview, right column with messenger-style relative time above a green unread
  `NotificationBadge`; search (phone / WA display name / linked user email or name including first+last / last+first), pinned bottom
  pagination (`page` / `pageSize`), live updates, sidebar unread badge.
- `/admin/whats-app-chats/<id>` — human transcript with attachments + delivery ticks + emoji reaction badges on the target bubble; inbound
  voice notes (`audio/*`) render as a WhatsApp-style player (avatar + mic badge, play/pause, scrubbable waveform, duration) instead of a
  file tile; free-form reply only inside the Meta 24h customer-service window (text-only, no outbound voice); smile control on inbound
  bubbles sends (or clears) a business emoji reaction via Meta; mark read on open (admin unread + Meta blue-tick). Slim presence banner
  (avatar → admin user when matched, initials otherwise; context line only — no repeated name/phone; crumbs carry the peer label). Nested
  transcript owns the pane scroll under `AdminPinnedFooterLayout` `contentScroll={false}` (chrome breakout so the scrollbar sits on the pane
  edge). Caption-less audio/voice ingest stores body `Sprachnachricht` for inbox / Slack preview.
- User detail **WhatsApp** tab lists that user’s conversations.
- Inbound Slack mirror on `SLACK_CHANNEL_WHATSAPP_MESSAGES`; known reaction quick-replies also post on the booking Slack thread. Customer
  emoji reactions (Meta `type: reaction`) do not Slack-notify; they bump unread, refresh the 24h window, and overlay the target message.

### Ops prerequisite

Before `WHATSAPP_TRANSPORT=meta` in Coolify: subscribe the Meta app webhook to `messages` + `message_statuses`, confirm Meta template
**names** match `whatsappTemplateNameByPurpose` in `src/server/domain/whatsapp.ts` (approved Manager keys such as
`user_booking_request_create__for_user`, not reinvented slugs), and set secrets (including Slack WhatsApp channel when
`SLACK_TRANSPORT=slack`). Local/dev uses `console` (no phone delivery). Purposes mapped to `null` are a product choice (email-only after
payment / selected closures), not missing Manager entries.

Feature toggles (admin `/admin/feature-toggles`, missing = off):

- `WHATSAPP_ENGLISH_TEMPLATES` — enable only after EN templates are approved in WhatsApp Manager; until then EN recipients fall back to Meta
  language `de`

Webhook signature validation (`X-Hub-Signature-256`) is always on when `WHATSAPP_TRANSPORT=meta`. If `WHATSAPP_APP_SECRET` does not match
the Meta app secret, Meta POSTs return `400` and inbound never lands in admin (look for
`whatsapp webhook: POST rejected (invalid signature…)` in Admin Logs / Coolify logs).

## Decisions

### Alternatives considered

| Topic                      | Choice                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Channel model              | Dedicated conversations (not SupportRequests)                                            |
| Send policy (pre-payment)  | Email + WhatsApp when phone is E.164                                                     |
| Send policy (post-payment) | Email only for money / selected closures (`null` template names) — Meta sends cost money |
| Free-form reply            | Only inside 24h window                                                                   |
| Cook notifies              | Included when cook has E.164 phone                                                       |
| Media                      | Inbound → FileUploads; admin outbound text-only                                          |
| Emoji reactions            | Overlay on target message (not transcript rows); admin can react to inbound              |

### Chosen

Meta Cloud API + audit table + Concierge inbox, mirroring outbound-email / support-request patterns. Keep expensive post-payment WhatsApp
off until product explicitly extends those purposes.

## Ideas

- Admin outbound media attach
- Richer AdminAssistant-style tooling on the Concierge surface
- WhatsApp contact avatars (not available via Meta Cloud API; peopleeat profile pictures only)
- Optionally enable WhatsApp for post-payment / cancel purposes (approve Manager templates + non-null map entries)

## Implementation

| Area      | Notes                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Provider  | `src/server/whatsapp/whatsappCreate.ts`, `ServerRuntime.whatsapp`                                                                 |
| Domain    | `src/server/domain/whatsapp.ts`                                                                                                   |
| Tables    | `WhatsAppConversations`, `WhatsAppMessages`, `WhatsAppMessageAttachments`, `WhatsAppMessageReactions`, `OutboundWhatsAppMessages` |
| Webhook   | `src/routes/api/webhooks/whatsapp.ts`, `whatsappWebhookApply`                                                                     |
| Lifecycle | `bookingRequestLifecycleWhatsApp.ts`, `bookingRequestOfferCallSlotWhatsApp.ts`                                                    |
| Reaction  | `bookingRequestReactionReminder` job; inbound emoji via webhook; admin `whatsAppMessageReactionUpsert` → `sendReaction`           |
| Slack     | `src/server/slack/whatsappSlack.ts`, channel `whatsAppMessages`                                                                   |
| Admin GQL | `whatsAppConversations*`, `whatsAppMessageCreate`, `whatsAppMessageReactionUpsert`, unread reset; `ChatMessageUser.reactions`     |
| Admin UI  | `AdminWhatsAppChatsPage`, `AdminWhatsAppChatPage`, user tab, sidebar badge                                                        |
| Docs      | [architecture/whatsapp.md](../architecture/whatsapp.md)                                                                           |

See [admin-shell.md](./admin-shell.md), [admin-users.md](./admin-users.md), [booking-request-create.md](./booking-request-create.md),
[slack-notifications.md](./slack-notifications.md), [styles/chat.md](../styles/chat.md).
