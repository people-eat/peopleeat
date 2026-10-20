import { and, eq, inArray } from 'drizzle-orm';

import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../../db/schema';
import { userBookingRequestReactionReminderWhatsAppSend } from '../../utils/bookingRequestLifecycleWhatsApp';
import type { QueuedJobDefinition } from '../types';

interface BookingRequestReactionReminderData {
    bookingRequestId: string;
}

/**
 * 48h customer WhatsApp nudge when offers exist, remain unread/unaccepted, and
 * the customer has not messaged or requested menu changes.
 */
export const bookingRequestReactionReminder: QueuedJobDefinition<BookingRequestReactionReminderData> = {
    kind: 'queued',
    name: 'booking-request-reaction-reminder',
    handler: async ({ data, serverRuntime }) => {
        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, data.bookingRequestId))
            .limit(1);

        if (!bookingRequest || bookingRequest.canceledAt != null) {
            return;
        }

        const offers = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestId, data.bookingRequestId));

        if (offers.length === 0) {
            return;
        }

        const hasUnreadOffer = offers.some((offer) => offer.userUnreadNotificationCount > 0);
        if (!hasUnreadOffer) {
            return;
        }

        if (offers.some((offer) => offer.userAccepted === true)) {
            return;
        }

        if (offers.some((offer) => offer.userRequestedMenuAdjustments)) {
            return;
        }

        const offerIds = offers.map((offer) => offer.bookingRequestOfferId);
        const [userMessage] = await serverRuntime.db
            .select({ bookingRequestOfferEventId: bookingRequestOfferEvents.bookingRequestOfferEventId })
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    inArray(bookingRequestOfferEvents.bookingRequestOfferId, offerIds),
                    eq(bookingRequestOfferEvents.type, 'USER_MESSAGE_SIMPLE'),
                ),
            )
            .limit(1);

        if (userMessage) {
            return;
        }

        await userBookingRequestReactionReminderWhatsAppSend(serverRuntime, {
            bookingRequestId: data.bookingRequestId,
            customerUserId: bookingRequest.userId,
        });
    },
    options: {
        retryLimit: 3,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
