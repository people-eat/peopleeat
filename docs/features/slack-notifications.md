# Slack ops notifications

Internal Slack posts keep ops aware of marketplace, support, sign-up, and gift-card events without blocking product writes.

## Behavior

Ops receives structured Slack messages (German copy — internal surface):

- **Booking timeline** — one root message per booking request (channel by party size), then thread replies for lifecycle events
- **Sign-ups** — customer and cook registration
- **Support** — one root message per ticket, then thread replies for customer/admin messages and resolve
- **Gift cards** — successful purchases
- **Digests / alerts** — weekday booking report; 24h / 48h no-offer aging as a thread reply on the booking request; payment failures /
  payouts as booking-thread replies (channel-broadcast when urgency/visibility matters); **daily admin action-item report** (08:00
  Europe/Berlin, mirrors `/admin` queues) on the ops-alerts channel; **Resend quota at-risk alert** (00:00 and 19:00 Europe/Berlin, only
  when monthly or free-tier daily quota is at risk) on the same channel; **observability ops alert** (hourly, GraphQL/job error rate or p95,
  elevated error logs, or slow `pg_stat_statements`) on the same channel — see [observability.md](../architecture/observability.md)
- **WhatsApp Concierge** — inbound customer messages on `SLACK_CHANNEL_WHATSAPP_MESSAGES`; known reaction quick-replies also reply on the
  booking-request Slack thread

Failed Slack posts never roll back domain writes.

## Decisions

### Alternatives considered

| Option                                                           | Notes                                                                            |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Heavy bot framework with mandatory CTAs and emoji-first builders | Rejected — noisy, hard to maintain, duplicated message shapes                    |
| Incoming webhooks only                                           | Rejected — weak threading / reaction flexibility                                 |
| Outbound Web API + Block Kit builders                            | **Chosen** — shared message template; boot-required when `SLACK_TRANSPORT=slack` |

### Chosen

Outbound-only Slack client: root message on create (persist thread refs on the booking or support row), thread replies for later events,
Block Kit layout (header → fields → optional body → context → optional admin button).

## Ideas

- Weekly platform brief (sign-ups, bookings created, payments) reusing `adminActionItemsSnapshot` helpers plus activity metrics.

## Implementation

### Env

| Variable                                | Role                                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `SLACK_TRANSPORT`                       | `slack` (default) or `console` (local/dev: log posts to the terminal)                                             |
| `SLACK_BOT_TOKEN`                       | Bot token; required when `SLACK_TRANSPORT=slack`                                                                  |
| `SLACK_SIGNING_SECRET`                  | App signing secret; required when `SLACK_TRANSPORT=slack` (verifies Interactivity POSTs)                          |
| `SLACK_CHANNEL_BOOKING_REQUESTS`        | Default booking roots / threads                                                                                   |
| `SLACK_CHANNEL_CASH_COWS`               | ≥12 guests (same threshold as publication review)                                                                 |
| `SLACK_CHANNEL_SIGN_UPS`                | Customer / cook sign-ups                                                                                          |
| `SLACK_CHANNEL_SUPPORT_REQUESTS`        | Support tickets                                                                                                   |
| `SLACK_CHANNEL_GIFT_CARD_PURCHASES`     | Gift-card paid                                                                                                    |
| `SLACK_CHANNEL_BOOKING_REQUEST_REPORTS` | Weekday digest                                                                                                    |
| `SLACK_CHANNEL_OPS_ALERTS`              | Daily admin action-item report; Resend quota alerts; observability threshold alerts; other non-booking ops alerts |
| `SLACK_CHANNEL_WHATSAPP_MESSAGES`       | Inbound Concierge WhatsApp messages                                                                               |

When `SLACK_TRANSPORT=slack`, the bot token, signing secret, and every channel id are required at boot. When `console`, those credentials
are omitted and `postMessage` prints to the server terminal (same idea as `EMAIL_TRANSPORT=console`).

Root refs: `BookingRequests.references` / `SupportRequests.references` as `{ slackTs, slackChannelId }`.

### Interactivity Request URL (admin URL buttons)

Ops Block Kit messages include an `In Admin öffnen` **URL button**. Slack still POSTs to the app Interactivity Request URL on click and
expects HTTP 200 — otherwise the Slack client shows _This app responded with status code …_ (even though the browser opens the admin link).

1. Deploy with `SLACK_SIGNING_SECRET` set (Slack app → **Basic Information** → **App Credentials** → Signing Secret).
2. In the Slack app → **Interactivity & Shortcuts** → turn Interactivity **On**.
3. Set **Request URL** to `{WEB_PAGE_URL}/api/webhooks/slack` (e.g. `https://people-eat.com/api/webhooks/slack`).
4. Save — Slack probes the URL; the handler verifies the signature (or legacy `ssl_check`) and returns 200.

The route only acks; it does not run slash commands or other interactive workflows.

### Module layout

| Path                                               | Role                                    |
| -------------------------------------------------- | --------------------------------------- |
| `src/server/slack/slackCreate.ts`                  | WebClient wrapper                       |
| `src/server/slack/slackBlocks.ts`                  | Block Kit template                      |
| `src/server/slack/slackWebhookSignatureVerify.ts`  | HMAC verify for Interactivity POSTs     |
| `src/routes/api/webhooks/slack.ts`                 | Interactivity Request URL (ack only)    |
| `src/server/slack/bookingRequestSlack.ts`          | Booking root post + thread reply        |
| `src/server/slack/supportRequestSlack.ts`          | Support root post + thread reply        |
| `src/server/slack/slackNotifyBooking.ts`           | Booking lifecycle helpers               |
| `src/server/slack/slackNotifyAdjacent.ts`          | Sign-up / support / gift card           |
| `src/server/slack/whatsappSlack.ts`                | Concierge WhatsApp inbound + reactions  |
| `src/server/slack/slackNotifyCallSlot.ts`          | Call-slot events                        |
| `src/server/slack/adminActionItemsSnapshot.ts`     | Admin-home action queue snapshot        |
| `src/server/slack/adminActionItemsSlackMessage.ts` | German Block Kit for daily admin report |
| `src/server/slack/resendUsageSlackMessage.ts`      | German Block Kit for Resend quota alert |

### Jobs

- `booking-request-no-offers-notify` — queued per request at create (24h / 48h); cancelled when first offer arrives
- `booking-request-offer-event-tomorrow-notify` — queued per paid offer; fires 08:00 Europe/Berlin day before event
- `booking-request-slack-digest` — weekday open-request digest (recurring)
- `admin-action-items-slack-daily` — every day ≈08:00 Europe/Berlin, admin-home queues to ops-alerts (DST-safe via UTC `0 6,7 * * *` +
  Berlin hour gate)
- `resend-usage-slack-alert` — every day ≈00:00 and 19:00 Europe/Berlin, posts only when Resend monthly (or free-tier daily) quota is at
  risk (DST-safe via UTC `0 17,18,22,23 * * *` + Berlin hour gate); see [admin-outbound-emails.md](./admin-outbound-emails.md)
- `observability-ops-alert` — hourly (`15 * * * *`), posts only when in-process RED windows, recent error logs, or slow SQL cross
  thresholds; see [observability.md](../architecture/observability.md)

### Out of scope

Interactive workflows beyond the URL-button ack (slash commands, modals, action handlers), DM bot, message edits/reactions, historical
thread migration. WhatsApp is a separate channel — see [whatsapp.md](./whatsapp.md).
