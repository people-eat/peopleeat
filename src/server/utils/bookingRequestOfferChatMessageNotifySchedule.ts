import { eq } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferChatMessageNotify } from '../jobs/handlers/bookingRequestOfferChatMessageNotify';
import type { BookingRequestOfferChatMessageNotifyAudience } from './bookingRequestOfferChatMessageNotifyEmails';

const DEBOUNCE_MS = 60_000;

function jobIdColumn(audience: BookingRequestOfferChatMessageNotifyAudience) {
    return audience === 'CUSTOMER' ? 'customerChatMessageNotifyJobId' : 'cookChatMessageNotifyJobId';
}

async function cancelStoredJob(serverRuntime: ServerRuntime, jobId: string | null | undefined): Promise<void> {
    if (!jobId) return;
    try {
        await serverRuntime.jobs.cancel(bookingRequestOfferChatMessageNotify.name, jobId);
    } catch (error) {
        serverRuntime.log.error(error, null);
    }
}

/**
 * Cancel any pending offer-chat message-notify job for this audience
 * (unread reset). Failures are logged and do not undo the write.
 */
export async function bookingRequestOfferChatMessageNotifyCancel(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestOfferId: string;
        audience: BookingRequestOfferChatMessageNotifyAudience;
        existingJobId?: string | null;
    },
): Promise<void> {
    const column = jobIdColumn(args.audience);
    let jobId = args.existingJobId;
    if (jobId === undefined) {
        const [row] = await serverRuntime.db
            .select({
                customerChatMessageNotifyJobId: bookingRequestOffers.customerChatMessageNotifyJobId,
                cookChatMessageNotifyJobId: bookingRequestOffers.cookChatMessageNotifyJobId,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId))
            .limit(1);
        jobId = row?.[column] ?? null;
    }

    await cancelStoredJob(serverRuntime, jobId);

    await serverRuntime.db
        .update(bookingRequestOffers)
        .set({ [column]: null })
        .where(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId));
}

/**
 * Schedule (or re-schedule) the 1-minute debounced offer-chat notify email.
 * Cancels any prior pending job for the same offer + audience so rapid
 * messages coalesce into one mail.
 */
export async function bookingRequestOfferChatMessageNotifySchedule(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestOfferId: string;
        audience: BookingRequestOfferChatMessageNotifyAudience;
        existingJobId?: string | null;
    },
): Promise<void> {
    await bookingRequestOfferChatMessageNotifyCancel(serverRuntime, args);

    const jobId = await serverRuntime.jobs.enqueue(
        bookingRequestOfferChatMessageNotify,
        { bookingRequestOfferId: args.bookingRequestOfferId, audience: args.audience },
        { startAfter: new Date(Date.now() + DEBOUNCE_MS) },
    );

    if (!jobId) {
        return;
    }

    const column = jobIdColumn(args.audience);
    await serverRuntime.db
        .update(bookingRequestOffers)
        .set({ [column]: jobId })
        .where(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId));
}
