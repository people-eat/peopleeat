import { SpanStatusCode, trace } from '@opentelemetry/api';

import type { ServerRuntime } from '../domain/ServerRuntime';
import { jobHandlerRecord, jobHandlerWindowRecord } from '../observability/redMetrics';
import { ensureBossStarted } from './boss';
import { jobDefinitions } from './jobDefinitions';

let workersRegisteredPromise: Promise<void> | undefined;

const tracer = trace.getTracer('peopleeat.jobs');

export async function ensureJobsStarted(serverRuntime: ServerRuntime): Promise<void> {
    const boss = await ensureBossStarted();

    if (!workersRegisteredPromise) {
        workersRegisteredPromise = (async () => {
            for (const definition of jobDefinitions) {
                await boss.createQueue(definition.name);
                await boss.work(definition.name, async (jobs) => {
                    const job = jobs[0]!;
                    const startedAt = Date.now();
                    await tracer.startActiveSpan(`job ${definition.name}`, async (span) => {
                        span.setAttribute('job.name', definition.name);
                        span.setAttribute('job.id', String(job.id));
                        try {
                            await definition.handler({ data: job.data, serverRuntime });
                            const durationMs = Date.now() - startedAt;
                            jobHandlerRecord(definition.name, durationMs, false);
                            jobHandlerWindowRecord(definition.name, durationMs, false);
                        } catch (error) {
                            span.recordException(error instanceof Error ? error : new Error(String(error)));
                            span.setStatus({
                                code: SpanStatusCode.ERROR,
                                message: error instanceof Error ? error.message : 'Job failed',
                            });
                            const durationMs = Date.now() - startedAt;
                            jobHandlerRecord(definition.name, durationMs, true);
                            jobHandlerWindowRecord(definition.name, durationMs, true);
                            throw error;
                        } finally {
                            span.end();
                        }
                    });
                });

                if (definition.kind === 'recurring') {
                    await boss.schedule(definition.name, definition.cron);
                }
            }

            process.on('SIGTERM', async () => {
                await boss.stop({ graceful: true });
            });
            process.on('SIGINT', async () => {
                await boss.stop({ graceful: true });
            });
        })();
    }

    await workersRegisteredPromise;
}

export { bookingRequestOfferTestimonialReminder } from './handlers/bookingRequestOfferTestimonialReminder';
export { chatTitleGenerate } from './handlers/chatTitleGenerate';
export { cookBiographySummaryGenerate } from './handlers/cookBiographySummaryGenerate';
export { cookBookingRequestMenuEvaluationGenerateJob } from './handlers/cookBookingRequestMenuEvaluationGenerate';
export { bookingRequestAdjustedMessageGenerate } from './handlers/bookingRequestAdjustedMessageGenerate';
export { bookingRequestExpireNotify } from './handlers/bookingRequestExpireNotify';
export { bookingRequestNoOffersNotify } from './handlers/bookingRequestNoOffersNotify';
export { bookingRequestOfferCallRecordingFinalize } from './handlers/bookingRequestOfferCallRecordingFinalize';
export { bookingRequestOfferCallRoomsSweep } from './handlers/bookingRequestOfferCallRoomsSweep';
export { bookingRequestOfferCallSlotReminder } from './handlers/bookingRequestOfferCallSlotReminder';
export { bookingRequestOfferCallSlotsComplete } from './handlers/bookingRequestOfferCallSlotsComplete';
export { bookingRequestOfferChatMessageNotify } from './handlers/bookingRequestOfferChatMessageNotify';
export { bookingRequestOfferEventTomorrowNotify } from './handlers/bookingRequestOfferEventTomorrowNotify';
export { bookingRequestOfferPullPayment } from './handlers/bookingRequestOfferPullPayment';
export { bookingRequestOfferPullPaymentAnnouncement } from './handlers/bookingRequestOfferPullPaymentAnnouncement';
export { giftCardPreparedExpire } from './handlers/giftCardPreparedExpire';
export { supportRequestCustomerReplyNotify } from './handlers/supportRequestCustomerReplyNotify';
export { userKlaviyoProfileSync } from './handlers/userKlaviyoProfileSync';
