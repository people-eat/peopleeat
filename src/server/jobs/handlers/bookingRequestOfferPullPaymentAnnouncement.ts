import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../../db/schema';
import { bookingRequestOfferPullPaymentAnnouncementEmailSend } from '../../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferPullPaymentDueDate } from '../../utils/bookingRequestOfferPaymentPrepare';
import type { QueuedJobDefinition } from '../types';

interface BookingRequestOfferPullPaymentAnnouncementData {
    bookingRequestOfferId: string;
}

/**
 * Reminds the customer that the saved card will be charged soon (~15d before event).
 */
export const bookingRequestOfferPullPaymentAnnouncement: QueuedJobDefinition<BookingRequestOfferPullPaymentAnnouncementData> = {
    kind: 'queued',
    name: 'booking-request-offer-pull-payment-announcement',
    handler: async ({ data, serverRuntime }) => {
        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, data.bookingRequestOfferId))
            .limit(1);

        if (!row) return;
        if (row.offer.paymentStatus !== 'SETUP') return;

        const pullPaymentDate = row.offer.plannedPaymentPullDateTime ?? bookingRequestOfferPullPaymentDueDate(row.bookingRequest.dateTime);

        await bookingRequestOfferPullPaymentAnnouncementEmailSend(serverRuntime, {
            bookingRequestOfferId: row.offer.bookingRequestOfferId,
            bookingRequestId: row.bookingRequest.bookingRequestId,
            customerUserId: row.bookingRequest.userId,
            totalCentsCustomer: row.offer.totalCentsCustomer ?? 0,
            pullPaymentDate,
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        serverRuntime.log.info(`bookingRequestOfferPullPaymentAnnouncement: pull due soon for ${data.bookingRequestOfferId}`);
    },
    options: {
        retryLimit: 2,
        retryDelay: 60,
        expireInSeconds: 300,
    },
};
