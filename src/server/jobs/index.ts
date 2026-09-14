import type { ServerRuntime } from '../domain/ServerRuntime';
import { ensureBossStarted } from './boss';
import { jobDefinitions } from './jobDefinitions';

let workersRegisteredPromise: Promise<void> | undefined;

export async function ensureJobsStarted(serverRuntime: ServerRuntime): Promise<void> {
    const boss = await ensureBossStarted();

    if (!workersRegisteredPromise) {
        workersRegisteredPromise = (async () => {
            for (const definition of jobDefinitions) {
                await boss.createQueue(definition.name);
                await boss.work(definition.name, async (jobs) => {
                    const job = jobs[0]!;
                    await definition.handler({ data: job.data, serverRuntime });
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
