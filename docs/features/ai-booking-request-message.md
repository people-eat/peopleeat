# AI booking-request adjusted message

When a customer (or admin) creates a booking request, the platform can rewrite the free-text message into a cook-facing `adjustedMessage`:
strip phone / email / street address, light polish, keep personality. Cooks always see `adjustedMessage ?? originalMessage`.

## Behavior

1. After user or admin create, if `AI_BOOKING_REQUEST_MESSAGE` is enabled for the customer and `originalMessage` is non-empty, the server
   enqueues `booking-request-adjusted-message-generate`.
2. The job runs a one-shot LLM rewrite, writes `BookingRequests.adjustedMessage`, records `AiGenerations`
   (`BOOKING_REQUEST_ADJUSTED_MESSAGE`), and publishes `adminUpdates` plus `userUpdates` for cooks already on the request.
3. Create never waits on the model. Failure leaves `adjustedMessage` null so cooks keep seeing `originalMessage`.
4. Admin edit can set or clear `adjustedMessage` manually. AI never overwrites a non-null adjusted value.
5. Admin update re-enqueues only when `originalMessage` changes **and** the resulting `adjustedMessage` is null (clear + edit original to
   regenerate).
6. Pending jobs show on the admin booking-request detail (`queuedJobs`) and on `/admin/jobs`. Request cancel cancels the pending job.

## Decisions

| Decision                                      | Why                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| Async job (not sync on create)                | Create is already heavy; do not couple success to LLM latency or provider outages |
| Feature toggle `AI_BOOKING_REQUEST_MESSAGE`   | Ops can disable without a deploy                                                  |
| Skip when `adjustedMessage` already set       | Preserves admin overrides                                                         |
| Re-run only on original change + cleared adj. | Avoid surprise overwrites when admin edits original while keeping a cook message  |
| Accept brief original-message window          | Cook notify does not embed the body; offer-chat seed may briefly use original     |

## Implementation

| Piece            | Path                                                                         |
| ---------------- | ---------------------------------------------------------------------------- |
| Generate command | `src/server/commands/bookingRequestAdjustedMessageGenerate.ts`               |
| Job              | `src/server/jobs/handlers/bookingRequestAdjustedMessageGenerate.ts`          |
| Schedule         | `src/server/utils/bookingRequestAdjustedMessageGenerateSchedule.ts`          |
| Create triggers  | `userBookingRequestCreate.ts`, `adminBookingRequestCreate.ts`                |
| Admin re-enqueue | `adminBookingRequestUpdate.ts`                                               |
| Admin list       | `adminBookingRequestScopedQueuedJobsFindMany` + `adminQueuedJobLabels.ts`    |
| Cancel on cancel | `bookingRequestQueuedJobsCancel.ts`                                          |
| Model            | `serverRuntime.ai.bookingRequestAdjustedMessageModel()` → `gemini-2.5-flash` |
| Kind             | `BOOKING_REQUEST_ADJUSTED_MESSAGE`                                           |
| Toggle           | `AI_BOOKING_REQUEST_MESSAGE`                                                 |

Related: [booking-request-create.md](./booking-request-create.md), [admin-booking-requests.md](./admin-booking-requests.md),
[ai-generations.md](../architecture/ai-generations.md), [jobs.md](../architecture/jobs.md),
[admin-feature-toggles.md](./admin-feature-toggles.md).

Downstream idea: an AI **suggested offer message** on cook offer create that replies to this adjusted text — see
[booking-offers.md — AI suggested offer message](./booking-offers.md#ai-suggested-offer-message).
