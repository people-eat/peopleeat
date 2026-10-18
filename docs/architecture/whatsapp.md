# WhatsApp

## Context

Customers are promised booking updates by email and WhatsApp. Ops need a Concierge inbox for inbound customer messages on the business
number. Preferred-communication preference alone is not enough: Meta Cloud API requires approved utility templates outside the 24h
customer-service window, and every send must be auditable.

## Decision

1. **`WHATSAPP_TRANSPORT`** — `meta` (default) or `console`. When `meta`, boot requires `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. When `console`, those are omitted and sends print
   to the terminal (same pattern as email/Slack).
2. **`serverRuntime.whatsapp`** — `sendTemplate` / `sendText` orchestrate audit + inbox transcript; `downloadMedia` / `markMessageAsRead`
   support inbound media and Meta blue-ticks. Provider lives in `whatsappCreate()` (Graph API `v22.0` `/{phone-number-id}/messages`).
3. **Always both** — for supported lifecycle events, send WhatsApp whenever the recipient `Users.phoneNumber` is valid E.164, **in addition
   to** email. Do **not** gate on `preferredCommunication`. Cooks are included when they have a phone.
4. **Tables** — `OutboundWhatsAppMessages` (one row per send attempt; first-write-wins lifecycle + optional Meta conversation/pricing);
   `WhatsAppConversations` (unique phone; Meta / migrated inbox often omit leading `+` while `Users.phoneNumber` is E.164 with `+`, so admin
   joins and user lookups match on digits; optional `userId` / `displayName`, `adminUnreadCount`, `customerServiceWindowExpiresAt`);
   `WhatsAppMessages` (inbound/outbound transcript with `messageKind`, delivery stamps, FK to outbound audit); `WhatsAppMessageAttachments`
   → `FileUploads`; `WhatsAppMessageReactions` (current emoji per party on a transcript message; Meta `type: reaction`, not a transcript
   row; null `emoji` tombstone when cleared).
5. **Webhook** — `GET`/`POST` `/api/webhooks/whatsapp` (Meta challenge + optional `X-Hub-Signature-256`). Signature verification is gated by
   feature toggle `WHATSAPP_WEBHOOK_SIGNATURE_VALIDATION` (missing/off skips the check; enable once Meta app secret is confirmed). A wrong
   `WHATSAPP_APP_SECRET` with the toggle on rejects every Meta POST with `400` and no transcript/status updates — the route logs
   `whatsapp webhook: POST rejected (invalid signature…)` and successful applies as `whatsapp webhook: applied statuses=… messages=…`. When
   `WHATSAPP_TRANSPORT=meta` and `WEB_PAGE_URL` is not already `demo.people-eat.com`, each POST is also fire-and-forget forwarded (raw
   body + signature) to `https://demo.people-eat.com/api/webhooks/whatsapp` for test mirroring (Meta allows only one callback URL per app).
   Inbound upserts conversation/message (conflict-safe on phone), downloads media into `FileUploads`, opens a 24h session window,
   Slack-notifies `SLACK_CHANNEL_WHATSAPP_MESSAGES`, and routes known reaction quick-replies onto the booking Slack thread when possible.
   Emoji reactions upsert `WhatsAppMessageReactions` on the target `providerMessageId`, bump unread + 24h window, and skip Slack. Statuses
   stamp audit + linked transcript delivery columns.
6. **Admin free-form reply** — only while `customerServiceWindowExpiresAt` is in the future (`CONCIERGE_SESSION_REPLY`). Opening a chat
   clears admin unread and calls Meta `markMessageAsRead` for the latest inbound. Outside the window, lifecycle templates still send; ops
   cannot free-type. Admin composer is text-only (no outbound media attach).
7. **Template buttons** — `sendTemplate` may pass a URL button dynamic path segment (`buttonUrlParameter`) for deep links approved in
   WhatsApp Manager.

Template **names** in `whatsappTemplateNameByPurpose` (`src/server/domain/whatsapp.ts`) must match Meta-approved keys from the predecessor
WhatsApp integration (e.g. `user_booking_request_create__for_user`, `call_slot_booking_reminder_60_min_before`). Do not invent snake_case
purpose slugs. Purposes without an approved template map to `null` and are skipped at send time (email still goes). Bodies and button URL
segments must match the approved Meta variable order.

## Alternatives considered

| Option                                 | Why not                                              |
| -------------------------------------- | ---------------------------------------------------- |
| Gate sends on `preferredCommunication` | Product decision is always-both when phone exists    |
| Merge into SupportRequests             | Separate admin catalog surface; Meta phone-keyed     |
| Reuse assistant chat spine             | Pollutes LLM replay; same rejection as support/offer |
| Silent no-op when Meta secrets unset   | Rejected — use explicit `console` transport          |
| Local disk for inbound media           | Rejected — use shared `FileUploads` bytea store      |

## Consequences

- Local/dev uses `WHATSAPP_TRANSPORT=console` (prints `[whatsapp:console] …`; no Meta delivery).
- `Users.phoneNumber` must be stored as E.164 with a leading `+` and country code (`phoneNumberAssert` / `phoneNumberNormalize` in
  `src/shared/phoneNumber.ts`). WhatsApp send normalizes again and strips `+` for Meta (`phoneNumberForWhatsAppApi`). Missing/invalid phone,
  or `null` template name, skips WhatsApp without failing the booking write (structured `log.info` with raw phone). Meta/provider failures
  stamp `OutboundWhatsAppMessages.failureReason` and `log.error`.
- Public `wa.me` marketing CTAs remain; they open the same business number.
- Ops must keep Meta names in sync with WhatsApp Manager for DE (and EN when ready). Until EN templates are approved, leave
  `WHATSAPP_ENGLISH_TEMPLATES` off so EN recipients still send with Meta language `de`.
- History migration from the predecessor `ExternalMessages` store ships via the go-live ETL
  ([go-live-data-migration.md](../features/go-live-data-migration.md)); WhatsApp channel rows map into `WhatsApp*`, other channels archive.

See [features/whatsapp.md](../features/whatsapp.md) and [infrastructure.md](../infrastructure.md).
