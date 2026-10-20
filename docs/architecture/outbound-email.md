# Outbound email

## Context

Transactional mail (gift-card purchase, auth OTP, email-address confirmation, call-slot lifecycle, booking-request lifecycle, testimonial
nudges) must be auditable in admin: every send attempt, delivery lifecycle, and which domain entity / user it belonged to. Address changes
and retries must not erase history.

## Decision

1. **`OutboundEmails` table** — one row per send attempt. Snapshot `toEmail` + optional `userId`. Classify with `purpose`. Link subjects via
   polymorphic `relatedEntityType` + `relatedEntityId` (no per-entity nullable FKs on the email row).
2. **`userId` attribution** — set at send when the recipient (or acting user) is already known. Legitimate null-at-send cases: signup
   `AUTH_EMAIL_OTP` (no account yet) and guest `GIFT_CARD_PURCHASED`. When `userCreate` inserts the account for that address,
   `outboundEmailsUserIdBackfillByToEmail` stamps `userId` on matching rows where `userId IS NULL` so admin user → emails tabs stay
   complete. Already-attributed rows and other addresses are left alone. Sign-in OTP for a known email looks up `users` at send time and
   needs no backfill.
3. **`serverRuntime.email.send`** inserts the row first, optionally inserts `OutboundEmailAttachments` join rows when callers pass
   `attachments` with `fileUploadId`, calls Resend (or console) with binary attachments, then stamps `providerMessageId` + `sentAt` or
   `failedAt` / `failureReason`. Returns `{ outboundEmailId }`. The Resend `from` value is `SITE_NAME <RESEND_FROM_EMAIL>` (e.g.
   `peopleeat <peopleeat@mail.people-eat.com>`) unless `RESEND_FROM_EMAIL` already includes a display name. Before each Resend API call,
   `resendSendRateLimit.acquire()` paces starts under the default **10 req/s** team limit (cap 8/s with headroom) so bulk paths like
   `bookingRequestCooksNotify` (`Promise.all` over radius cooks) do not 429. **`serverRuntime.email.usageGet`** returns live Resend
   monthly/daily quota (`EmailUsage`) or `null` when `EMAIL_TRANSPORT=console`; throws when the Resend usage API fails. Admin overview and
   the quota Slack alert call this instead of importing Resend directly.
4. **Resend webhooks** at `/api/webhooks/resend` verify Svix signatures with `RESEND_WEBHOOK_SECRET`, then `outboundEmailProviderEventApply`
   first-write-wins lifecycle timestamps (`sentAt`, `deliveredAt`, `deliveryDelayedAt`, `openedAt`, `clickedAt`, `bouncedAt`,
   `complainedAt`, `failedAt`). Happy-path applies are silent; `log.warn` only for unexpected/unhandled inputs (missing/invalid Svix
   signature, missing `email_id`, unknown event type). Orphan `emailId` values (no matching `OutboundEmails` row) stay silent so Resend
   at-least-once retries do not flood logs; `log.error` when the handler throws.
5. **Admin GraphQL** — `Admin.outboundEmails` / `outboundEmailsCounts` / `outboundEmailCreations` / `outboundEmailRecipientStats` /
   `outboundEmailPurposeStats` / `outboundEmail` with criterion filters (`searchText`, `purposes`, optional `lifecycleStatuses`, `userId`,
   related entity). Rankings omit `range` for all-time (overview default). Detail exposes `attachments`. `Admin.resendUsage` resolves via
   `serverRuntime.email.usageGet()` (null when console transport or API failure) for the overview quota hero.

## Alternatives considered

| Option                                                        | Why not                                          |
| ------------------------------------------------------------- | ------------------------------------------------ |
| Nullable `giftCardId` (and later booking/offer FKs) on emails | Does not scale — every new entity adds a column  |
| Single `GiftCards.purchaseEmailId`                            | Overwrites retries; fights 1:n attempts          |
| Submit-only tracking without webhooks                         | Cannot answer opened/clicked; deferred analytics |
| Admin filter OR-match on current `users.emailAddress`         | Brittle after address changes; leaves rows wrong |

## Consequences

- New domains add an enum value for `relatedEntityType` / `purpose`, not a schema column.
- Retries are multiple rows sharing the same related entity — admin lists show all attempts.
- Console transport still persists rows (no `providerMessageId`) so local admin UI works.
- When `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `RESEND_WEBHOOK_SECRET` are required at boot.
- Parallel fan-out senders (cook radius notify, etc.) rely on `resendSendRateLimit` rather than per-call-site throttling; raising Resend's
  team limit in the dashboard does not remove the in-process cap until `RESEND_SEND_MAX_PER_SECOND` is raised.
- Pre-account outbound rows become visible on the user emails tab only after signup backfill (or if `userId` was known at send).
- Marketing audience continuity lives in Klaviyo profile sync, not OutboundEmails — see
  [features/klaviyo-profile-sync.md](../features/klaviyo-profile-sync.md).
- **Locale on send** — `OutboundEmails.locale` is required at send time. Lifecycle / job emails for known users take each recipient’s
  `Users.locale` (see [i18n.md](./i18n.md)). Interactive OTP and gift-card purchase still pass request-time or entity-snapshot locale
  (guest-safe). Slack ops formatting stays German.
