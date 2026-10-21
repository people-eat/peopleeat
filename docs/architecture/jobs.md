# Jobs (Background Processing)

## Context

The application needs two categories of background work:

1. **Recurring jobs** — run on a cron schedule (e.g., weekday open-request Slack digest, hourly `observability-ops-alert` — see
   [observability.md](./observability.md))
2. **Queued/scheduled jobs** — enqueued programmatically to run at a specific future time (e.g., expire an unpaid gift card after 15
   minutes)

## Decision

Use **pg-boss** — a PostgreSQL-backed job queue that supports both cron scheduling and delayed/scheduled jobs.

## Alternatives Considered

| Option                             | Pros                                                                                 | Cons                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| **pg-boss** (chosen)               | No extra infra, uses existing PG, transactional consistency, supports both job types | Lower throughput than Redis-backed queues              |
| **BullMQ + Redis**                 | Higher throughput, mature ecosystem                                                  | Requires Redis infrastructure, separate failure domain |
| **Custom PG polling**              | Full control, no dependency                                                          | Maintenance burden, reinventing the wheel              |
| **External service (Trigger.dev)** | Managed, dashboard                                                                   | External dependency, cost, vendor lock-in              |

## Architecture

Jobs are integrated into the `ServerRuntime` DI container via `serverRuntime.jobs.enqueue()`. The worker (handler registration) runs as a
parallel consumer with its own `ServerRuntime` instance.

```
src/server/jobs/
├── boss.ts                     pg-boss singleton, ensureBossStarted(), jobEnqueue(), jobsActiveCount()
├── index.ts                    Worker registration (ensureJobsStarted), re-exports handlers
├── types.ts                    JobHandler, RecurringJobDefinition, QueuedJobDefinition
├── jobDefinitions.ts           Central registry (all jobs imported here)
└── handlers/
    ├── userKlaviyoProfileSync.ts Queued — Klaviyo marketing profile upsert
    ├── chatTitleGenerate.ts    Queued — LLM chat title after assistant turns
    ├── cookBiographySummaryGenerate.ts Queued — LLM cook biography summary after cook bio save
    ├── bookingRequestAdjustedMessageGenerate.ts Queued — LLM cook-facing booking-request message rewrite after create
    ├── cookBookingRequestMenuEvaluationGenerate.ts Queued — parallel menu ranking + inventory menu draft on pool open / refresh
    ├── giftCardPreparedExpire.ts Queued — abandon unpaid prepared gift cards
    ├── bookingRequestOfferPullPayment.ts Queued — off-session charge ~14d before event
    ├── bookingRequestOfferPullPaymentAnnouncement.ts Queued — remind customer ~15d before
    ├── bookingRequestExpireNotify.ts Queued — publish updates when expiresAt crosses
    ├── bookingRequestNoOffersNotify.ts Queued — Slack 24h/48h no-offer alerts
    ├── bookingRequestReactionReminder.ts Queued — 48h customer WhatsApp reaction nudge
    ├── bookingRequestOfferEventTomorrowNotify.ts Queued — Slack morning before paid event
    ├── bookingRequestSlackDigest.ts Recurring — weekday open-request Slack digest
    ├── adminActionItemsSlackDaily.ts Recurring — daily admin-home action queues to ops-alerts (08:00 Berlin)
    ├── resendUsageSlackAlert.ts    Recurring — Resend quota at-risk alert to ops-alerts (00:00 + 19:00 Berlin)
    ├── bookingRequestOfferCallSlotReminder.ts Queued — email both parties 60m before confirmed slot
    ├── bookingRequestOfferCallSlotsComplete.ts Queued — COMPLETED / expire PENDING slots at endAt
    ├── bookingRequestOfferCallRoomsSweep.ts Recurring — end empty LiveKit rooms ≥90s old
    ├── bookingRequestOfferCallRecordingFinalize.ts Queued — poll egress + Gemini STT after room end
    ├── bookingRequestOfferTestimonialReminder*.ts Queued — memory nudge + day-after review asks
    ├── supportRequestCustomerReplyNotify.ts Queued — 1m debounce customer email after admin support reply
    └── bookingRequestOfferChatMessageNotify.ts Queued — 1m debounce cook↔customer offer-chat email
```

### Key Files

- **`boss.ts`** — pg-boss singleton (`ensureBossStarted`), `jobEnqueue`, and `jobsActiveCount` used by `ServerRuntime`. Has no dependencies
  on handlers or `serverRuntimeCreate`, breaking circular imports.
- **`index.ts`** — Worker startup (`ensureJobsStarted`): registers handlers from `jobDefinitions` and sets up cron schedules. Called from
  `src/server/graphql/server.ts` alongside Apollo.
- **`ServerRuntime.jobs.enqueue`** — Wired in `serverRuntimeCreate.ts`, delegates to `jobEnqueue` from `boss.ts`. Provides full type safety
  via the definition's generic parameter. Options: `startAfter`, `transaction`, optional custom `id`, optional `singletonKey`.
- **`ServerRuntime.jobs.activeCount`** — Live count of `created` | `retry` | `active` jobs for a queue (`jobsActiveCount`). Prefer this over
  a stale “in progress” column on domain rows when UI only needs to know whether background work is currently running.
- **`ServerRuntime.jobs.findByData`** — Live `findJobs` by payload containment (`jobsFindByData`). Used by admin `queuedJobs` on booking
  request / offer pages.
- **`ServerRuntime.jobs.findById`** — Live `findJobs` by exact pg-boss job id (`jobsFindById`). Used when the id is deterministic per entity
  (e.g. cook biography summary) so GraphQL can expose generating flags without a domain column.

### Initialization

pg-boss uses the **lazy start** pattern (matching Apollo Server's `ensureServerStarted()`):

1. `ensureJobsStarted()` is called inside `ensureServerStarted()` in `src/server/graphql/server.ts`
2. On first call: creates the pg-boss instance, calls `boss.start()`, registers all handlers, sets up cron schedules
3. Concurrent callers share one in-flight promise (same pattern as `ensureBossStarted` / `ensureServerStarted`) so start and worker
   registration never run twice; later calls await that promise and return
4. The singleton is stored on `globalThis` to survive Vite HMR in development

### Schema

pg-boss manages its own tables in a `pgboss` PostgreSQL schema. These are created automatically by `boss.start()` — no Drizzle migration
required.

### Shutdown

`SIGTERM` and `SIGINT` handlers call `boss.stop({ graceful: true })`, which waits for in-progress jobs to complete before shutting down.

## How to Add a New Job

### Recurring Job

1. Create a handler file in `src/server/jobs/handlers/{entityAction}.ts`:

```typescript
import type { RecurringJobDefinition } from '../types';

export const myRecurringJob: RecurringJobDefinition = {
  kind: 'recurring',
  name: 'my-recurring-job',
  cron: '0 */6 * * *', // every 6 hours
  handler: async ({ serverRuntime }) => {
    // implementation
  },
};
```

2. Add it to `src/server/jobs/jobDefinitions.ts`
3. Add colocated `{entityAction}.test.ts` covering handler paths (see [Testing](#testing))

### Queued/Scheduled Job

1. Create a handler file:

```typescript
import type { QueuedJobDefinition } from '../types';

interface MyJobData {
  userId: string;
}

export const myQueuedJob: QueuedJobDefinition<MyJobData> = {
  kind: 'queued',
  name: 'my-queued-job',
  handler: async ({ data, serverRuntime }) => {
    // implementation using data.userId
  },
};
```

2. Add it to `src/server/jobs/jobDefinitions.ts`
3. Re-export from `src/server/jobs/index.ts` for ergonomic imports
4. Enqueue from commands via `serverRuntime.jobs.enqueue(myQueuedJob, data, options)`
5. Add colocated `{entityAction}.test.ts` for the handler; assert enqueue only from the caller’s tests

### Enqueuing Jobs

Jobs are enqueued via `serverRuntime.jobs.enqueue()`. The definition's generic parameter provides full type safety on the data payload:

```typescript
import { giftCardPreparedExpire } from '../jobs';

export async function giftCardCreate(..., serverRuntime: ServerRuntime) {
  await serverRuntime.jobs.enqueue(
    giftCardPreparedExpire,
    { giftCardId },
    { startAfter: new Date(now.getTime() + 15 * 60 * 1000) },
  );
}
```

### Transactional Enqueue

Pass a Drizzle transaction via the `transaction` option to enqueue a job atomically with your business logic. If the transaction rolls back,
the job is never created:

```typescript
await serverRuntime.db.transaction(async (transaction) => {
  await transaction.insert(giftCards).values(values);
  await serverRuntime.jobs.enqueue(
    giftCardPreparedExpire,
    { giftCardId },
    {
      startAfter: new Date(now.getTime() + 15 * 60 * 1000),
      transaction: transaction,
    },
  );
});
```

Under the hood this uses pg-boss's `fromDrizzle(transaction, sql)` adapter — no separate connection is needed for the enqueue.

## Testing

Split coverage so command suites and handler suites do not overlap:

| Layer                                               | Asserts                                                                                                    | Does not assert                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Command / schedule helper**                       | `serverRuntime.jobs.enqueue(definition, data, options?)` and `jobs.cancel` when applicable                 | Handler body, Stripe/email/Slack work inside the job |
| **Job handler** (`handlers/{entityAction}.test.ts`) | Calling `definition.handler({ data, serverRuntime })` — DB updates, publishes, I/O stubs, no-ops, failures | That some command enqueued the job                   |

`commandSetup` stubs `jobs.enqueue` as a resolved `vi.fn()`, so commands never start pg-boss or run the handler. Handlers are plain async
functions — test them with the real DB and stubbed runtime I/O, same as commands. See
[docs/conventions.md](../conventions.md#job-handler-tests).

## Consequences

- No additional infrastructure beyond PostgreSQL
- Jobs are transactionally enqueued alongside business data (same database)
- Job handlers are plain async functions — testable without pg-boss
- Single-process deployment: the worker runs in the same Node.js process as the web server
- If higher throughput is needed in the future, pg-boss can be replaced with BullMQ without changing the handler interface

## Cook biography summary

`cookBiographySummaryGenerate` (`src/server/jobs/handlers/cookBiographySummaryGenerate.ts`) is a queued job:

- Enqueued by `cookUpdate` when a cook saves a non-empty biography. Schedule helper cancels any prior **pending** jobs for that cook
  (`findByData({ cookId })` with states `created` | `retry` | `active`), then enqueues a new job (random pg-boss id — completed rows keep
  their uuid, so a fixed id would hit `ON CONFLICT DO NOTHING` on re-save).
- Cleared biography cancels pending jobs and sets `biographySummary` to `''` synchronously.
- Handler re-reads the cook row, runs `cookBiographySummaryGenerate` (command), writes `biographySummary`, publishes `userUpdates`.
  Soft-fails leave the prior summary in place.
- GraphQL `Cook.biographySummaryGenerating` / `AdminCook.biographySummaryGenerating` resolve via the same pending `findByData` check. Note:
  pg-boss `queued: true` is only `state < active` (excludes in-flight work), so this path uses `queued: false` and filters pending states in
  app code. No column on `Cooks`. Public cook types do not expose the flag.

## Gift-card prepared cleanup

`giftCardPreparedExpire` (`src/server/jobs/handlers/giftCardPreparedExpire.ts`) is a queued job:

- Enqueued by `giftCardCreate` with `startAfter: now + 15 minutes` (job id stored on `giftCards.cleanupJobId`).
- Cancelled via `serverRuntime.jobs.cancel(queueName, jobId)` when `giftCardPay` succeeds.
- Handler deletes the row only while `paymentStatus === PREPARED`, cancels the Stripe PaymentIntent, and publishes `sessionUpdates` +
  `adminUpdates`.

## Testimonial reminders

`bookingRequestOfferTestimonialReminder` (`src/server/jobs/handlers/bookingRequestOfferTestimonialReminder.ts`) is one queued job covering
three `kind`s (`MEMORY_NUDGE`, `REMINDER_MORNING`, `REMINDER_EVENING`) — see `docs/features/testimonials.md` for the schedule and
`docs/architecture/testimonials.md` for the domain shape.

- `scheduleTestimonialReminderJobs` (`src/server/utils/scheduleTestimonialReminderJobs.ts`) enqueues all three, storing each job id on
  `BookingRequestOffers.testimonial{MemoryNudge,ReminderMorning,ReminderEvening}JobId`. Called from `bookingRequestOfferPaymentFinalize`
  (PaymentIntent / already-transferred paths) and `bookingRequestOfferPullPayment` (SetupIntent pull success) — both "payment became PAYED"
  paths — and from `userBookingRequestUpdate` / `cookBookingRequestOfferAccept` when the event `dateTime` changes on an already-paid offer.
- `cancelTestimonialReminderJobs` cancels any stored job ids via `serverRuntime.jobs.cancel` and nulls the columns. Both scheduling helpers
  call it first (idempotent reschedule) and `userBookingRequestCancel` calls it directly for every offer on cancel.
- The handler is also a defensive backstop: it no-ops when the booking is canceled, the offer isn't dual-accepted/paid, or that party
  already has a testimonial — so a party submitting first never blocks (or cancels) the other party's reminders.

### Admin visibility (`queuedJobs`)

**Global list** — `Admin.queuedJobs` (`adminQueuedJobsFindMany`) walks every queued definition in `jobDefinitions`, loads pending rows via
`serverRuntime.jobs.findByData(definition, {})` (`queued: true` → `created` | `retry`), sorts by `startAfter`, and resolves offer / slot /
room payloads to booking-request deep-link ids when missing. UI: `/admin/jobs` — [admin-jobs.md](../features/admin-jobs.md). Admins can
cancel a pending row via `AdminMutation.queuedJobCancel` (`adminQueuedJobCancel`), which verifies the queue name against `jobDefinitions`
and calls `serverRuntime.jobs.cancel(name, jobId)`.

**Per booking** — lazy `queuedJobs: [AdminQueuedJob!]!` on `AdminBookingRequestOffer` and `AdminBookingRequest`. Same live `findByData`
pattern (payload containment). Offer-id queues (pull payment, announcement, testimonial reminder, chat notify, event-tomorrow Slack) are
matched directly; call-slot reminder / complete and call-recording finalize are resolved through the offer's `cookCallSlotBookingId` /
`bookingRequestOfferCallRoomId` rows. Request-scoped queues (expire notify, 24h/48h no-offers, adjusted-message AI) are matched by
`bookingRequestId` on the booking-request page. True recurring digests (Slack digest, admin action-items daily) and the LiveKit room sweep
are not listed on either surface — they have no durable per-entity pending row between cron fires.

### Booking request expire / no-offers / event-tomorrow / call-slot complete

These were converted from recurring scanners to per-entity queued jobs:

| Job                                      | Payload                                       | When enqueued                                                                                            | When cancelled                                     |
| ---------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `bookingRequestExpireNotify`             | `{ bookingRequestId }`                        | Create / `expiresAt` change (`startAfter: expiresAt`)                                                    | Accept (expires cleared), cancel, `expiresAt` null |
| `bookingRequestNoOffersNotify`           | `{ bookingRequestId, hours }`                 | Create (24h + 48h from `createdAt`)                                                                      | First offer, cancel, admin `createdAt` reschedule  |
| `bookingRequestAdjustedMessageGenerate`  | `{ bookingRequestId }`                        | Create (toggle on) / admin update when original changes and adjusted is null                             | Request cancel; reschedule cancels prior pending   |
| `bookingRequestOfferEventTomorrowNotify` | `{ bookingRequestId, bookingRequestOfferId }` | Payment becomes paid / dual-accept out-of-system / event date change — due 08:00 Berlin day before event | Offer queued-jobs cancel / booking cancel          |
| `bookingRequestOfferCallSlotsComplete`   | `{ cookCallSlotBookingId }`                   | Slot request (`endAt`); reschedule on confirm (`endAt+15m`)                                              | Decline / cancel / sibling superseded / handover   |

Schedule helpers live under `src/server/utils/bookingRequest*Schedule.ts` (and `bookingRequestQueuedJobsCancel` for request-scoped cancel).

## Support-request customer reply notify

`supportRequestCustomerReplyNotify` (`src/server/jobs/handlers/supportRequestCustomerReplyNotify.ts`) debounces the admin→customer reply
email by **1 minute**:

- Enqueued by `supportRequestCustomerReplyNotifySchedule` after `adminSupportRequestMessageCreate` (`startAfter: now + 60s`). Job id stored
  on `SupportRequests.customerReplyNotifyJobId`. Re-schedule cancels any prior pending job for the same case (coalesce rapid replies).
- Cancelled via `supportRequestCustomerReplyNotifyCancel` when the customer clears unread or an admin resolves the case.
- Handler no-ops when `userUnreadNotificationCount <= 0` (covers races where cancel loses to an already-started job).

## Offer-chat message notify

`bookingRequestOfferChatMessageNotify` (`src/server/jobs/handlers/bookingRequestOfferChatMessageNotify.ts`) debounces peer offer-chat emails
by **1 minute**, both directions:

| Direction       | Trigger command                            | Job data `audience` | Job id column                                         | Cancel on unread reset                                |
| --------------- | ------------------------------------------ | ------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Cook → customer | `cookBookingRequestOfferChatMessageCreate` | `CUSTOMER`          | `BookingRequestOffers.customerChatMessageNotifyJobId` | `userBookingRequestOfferUnreadNotificationCountReset` |
| Customer → cook | `userBookingRequestOfferChatMessageCreate` | `COOK`              | `BookingRequestOffers.cookChatMessageNotifyJobId`     | `cookBookingRequestOfferUnreadNotificationCountReset` |

- Schedule helpers: `bookingRequestOfferChatMessageNotifySchedule` / `…Cancel` in
  `src/server/utils/bookingRequestOfferChatMessageNotifySchedule.ts` (re-schedule cancels prior pending job for that offer + audience).
- Send util: `bookingRequestOfferChatMessageNotifyEmailSend` — purposes `BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER` /
  `BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK`; templates include message bubble + CTA to `?tab=chat`.
- Handler no-ops when that side’s unread count is `<= 0`. Admin chat messages do **not** schedule this email.
