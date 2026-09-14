import { eq } from 'drizzle-orm';

import { bookingRequestOfferCallRooms, cookCallSlotBookings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminQueuedJob } from '../graphql/generated';
import { bookingRequestExpireNotify } from '../jobs/handlers/bookingRequestExpireNotify';
import { bookingRequestNoOffersNotify } from '../jobs/handlers/bookingRequestNoOffersNotify';
import { bookingRequestOfferCallRecordingFinalize } from '../jobs/handlers/bookingRequestOfferCallRecordingFinalize';
import { bookingRequestOfferCallSlotReminder } from '../jobs/handlers/bookingRequestOfferCallSlotReminder';
import { bookingRequestOfferCallSlotsComplete } from '../jobs/handlers/bookingRequestOfferCallSlotsComplete';
import { bookingRequestOfferChatMessageNotify } from '../jobs/handlers/bookingRequestOfferChatMessageNotify';
import { bookingRequestOfferEventTomorrowNotify } from '../jobs/handlers/bookingRequestOfferEventTomorrowNotify';
import { bookingRequestOfferPullPayment } from '../jobs/handlers/bookingRequestOfferPullPayment';
import { bookingRequestOfferPullPaymentAnnouncement } from '../jobs/handlers/bookingRequestOfferPullPaymentAnnouncement';
import { bookingRequestOfferTestimonialReminder } from '../jobs/handlers/bookingRequestOfferTestimonialReminder';
import { toGqlAdminQueuedJob } from '../mappers/toGqlAdminQueuedJob';

function sortByStartAfter(jobs: GqlSAdminQueuedJob[]): GqlSAdminQueuedJob[] {
    return [...jobs].sort((a, b) => a.startAfter.getTime() - b.startAfter.getTime());
}

/**
 * Pending pg-boss jobs for one offer — pull payment, reminders, chat notify,
 * event-tomorrow Slack, call-slot reminder / complete, call-recording finalize.
 * Live lookup by payload (no stored job-id columns required).
 */
export async function adminBookingRequestOfferQueuedJobsByOfferIdFindMany(
    bookingRequestOfferId: string,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminQueuedJob[]> {
    const offerData = { bookingRequestOfferId };

    const [pullJobs, announcementJobs, testimonialJobs, chatNotifyJobs, eventTomorrowJobs, slotBookingIds, callRoomIds] = await Promise.all(
        [
            serverRuntime.jobs.findByData(bookingRequestOfferPullPayment, offerData),
            serverRuntime.jobs.findByData(bookingRequestOfferPullPaymentAnnouncement, offerData),
            serverRuntime.jobs.findByData(bookingRequestOfferTestimonialReminder, offerData),
            serverRuntime.jobs.findByData(bookingRequestOfferChatMessageNotify, offerData),
            serverRuntime.jobs.findByData(bookingRequestOfferEventTomorrowNotify, offerData),
            serverRuntime.db
                .select({ cookCallSlotBookingId: cookCallSlotBookings.cookCallSlotBookingId })
                .from(cookCallSlotBookings)
                .where(eq(cookCallSlotBookings.bookingRequestOfferId, bookingRequestOfferId))
                .then((rows) => rows.map((row) => row.cookCallSlotBookingId)),
            serverRuntime.db
                .select({ bookingRequestOfferCallRoomId: bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId })
                .from(bookingRequestOfferCallRooms)
                .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferId, bookingRequestOfferId))
                .then((rows) => rows.map((row) => row.bookingRequestOfferCallRoomId)),
        ],
    );

    const [slotReminderBatches, slotCompleteBatches, recordingJobBatches] = await Promise.all([
        Promise.all(
            slotBookingIds.map((cookCallSlotBookingId) =>
                serverRuntime.jobs.findByData(bookingRequestOfferCallSlotReminder, { cookCallSlotBookingId }),
            ),
        ),
        Promise.all(
            slotBookingIds.map((cookCallSlotBookingId) =>
                serverRuntime.jobs.findByData(bookingRequestOfferCallSlotsComplete, { cookCallSlotBookingId }),
            ),
        ),
        Promise.all(
            callRoomIds.map((bookingRequestOfferCallRoomId) =>
                serverRuntime.jobs.findByData(bookingRequestOfferCallRecordingFinalize, { bookingRequestOfferCallRoomId }),
            ),
        ),
    ]);

    const mapped = [
        ...pullJobs,
        ...announcementJobs,
        ...testimonialJobs,
        ...chatNotifyJobs,
        ...eventTomorrowJobs,
        ...slotReminderBatches.flat(),
        ...slotCompleteBatches.flat(),
        ...recordingJobBatches.flat(),
    ]
        .map(toGqlAdminQueuedJob)
        .filter((job): job is GqlSAdminQueuedJob => job != null);

    return sortByStartAfter(mapped);
}

/**
 * Request-scoped pending jobs (expire notify + no-offers Slack) for one booking
 * request. Used by the admin booking-request `queuedJobs` field alongside
 * offer-scoped lookups.
 */
export async function adminBookingRequestScopedQueuedJobsFindMany(
    bookingRequestId: string,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminQueuedJob[]> {
    const requestData = { bookingRequestId };
    const [expireJobs, noOffersJobs] = await Promise.all([
        serverRuntime.jobs.findByData(bookingRequestExpireNotify, requestData),
        serverRuntime.jobs.findByData(bookingRequestNoOffersNotify, requestData),
    ]);

    return [...expireJobs, ...noOffersJobs].map(toGqlAdminQueuedJob).filter((job): job is GqlSAdminQueuedJob => job != null);
}
