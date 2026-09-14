import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../../db/schema';
import { bookingRequestOfferPaymentIsPaid } from '../../domain/bookingRequest';
import { slackNotifyEventTomorrow } from '../../slack/slackNotifyBooking';
import type { QueuedJobDefinition } from '../types';

interface BookingRequestOfferEventTomorrowNotifyData {
    bookingRequestId: string;
    bookingRequestOfferId: string;
}

/**
 * Slack thread reply the morning before a paid dual-accepted event. Enqueued
 * when payment becomes paid (or event date changes), due at 08:00 Europe/Berlin
 * on the calendar day before the event.
 */
export const bookingRequestOfferEventTomorrowNotify: QueuedJobDefinition<BookingRequestOfferEventTomorrowNotifyData> = {
    kind: 'queued',
    name: 'booking-request-offer-event-tomorrow-notify',
    handler: async ({ data, serverRuntime }) => {
        const [row] = await serverRuntime.db
            .select({
                bookingRequestId: bookingRequests.bookingRequestId,
                bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                paymentStatus: bookingRequestOffers.paymentStatus,
                userAccepted: bookingRequestOffers.userAccepted,
                cookAccepted: bookingRequestOffers.cookAccepted,
                canceledAt: bookingRequests.canceledAt,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, data.bookingRequestOfferId))
            .limit(1);

        if (!row || row.canceledAt != null) {
            return;
        }

        if (row.userAccepted !== true || row.cookAccepted !== true) {
            return;
        }

        if (!bookingRequestOfferPaymentIsPaid(row.paymentStatus)) {
            return;
        }

        await slackNotifyEventTomorrow(serverRuntime, {
            bookingRequestId: row.bookingRequestId,
            bookingRequestOfferId: row.bookingRequestOfferId,
        });
    },
    options: {
        retryLimit: 1,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
