import { eq, sql } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../../db/schema';
import { slackNotifyNoOffers } from '../../slack/slackNotifyBooking';
import type { QueuedJobDefinition } from '../types';

export type BookingRequestNoOffersNotifyHours = 24 | 48;

interface BookingRequestNoOffersNotifyData {
    bookingRequestId: string;
    hours: BookingRequestNoOffersNotifyHours;
}

/**
 * Slack thread reply when a booking request still has no offers at 24h / 48h
 * after create. Enqueued per request on create; cancelled when the first offer
 * arrives or the request is canceled.
 */
export const bookingRequestNoOffersNotify: QueuedJobDefinition<BookingRequestNoOffersNotifyData> = {
    kind: 'queued',
    name: 'booking-request-no-offers-notify',
    handler: async ({ data, serverRuntime }) => {
        const [row] = await serverRuntime.db
            .select({
                bookingRequestId: bookingRequests.bookingRequestId,
                canceledAt: bookingRequests.canceledAt,
            })
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, data.bookingRequestId))
            .limit(1);

        if (!row || row.canceledAt != null) {
            return;
        }

        const [offer] = await serverRuntime.db
            .select({ one: sql`1` })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestId, data.bookingRequestId))
            .limit(1);

        if (offer) {
            return;
        }

        await slackNotifyNoOffers(serverRuntime, {
            bookingRequestId: data.bookingRequestId,
            hours: data.hours,
        });
    },
    options: {
        retryLimit: 1,
        retryDelay: 60,
        expireInSeconds: 300,
    },
};
