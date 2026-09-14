import { eq } from 'drizzle-orm';

import { bookingRequestOffers } from '../../db/schema';
import type { BookingRequestOfferChatMessageNotifyAudience } from '../../utils/bookingRequestOfferChatMessageNotifyEmails';
import { bookingRequestOfferChatMessageNotifyEmailSend } from '../../utils/bookingRequestOfferChatMessageNotifyEmails';
import type { QueuedJobDefinition } from '../types';

interface BookingRequestOfferChatMessageNotifyData {
    bookingRequestOfferId: string;
    audience: BookingRequestOfferChatMessageNotifyAudience;
}

/**
 * Debounced email after a peer offer-chat message. Skips when that side
 * already cleared unread (opened the chat). See
 * `docs/features/booking-offer-chat.md`.
 */
export const bookingRequestOfferChatMessageNotify: QueuedJobDefinition<BookingRequestOfferChatMessageNotifyData> = {
    kind: 'queued',
    name: 'booking-request-offer-chat-message-notify',
    handler: async ({ data, serverRuntime }) => {
        const [row] = await serverRuntime.db
            .select({
                bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount,
                cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, data.bookingRequestOfferId))
            .limit(1);

        // Unread reset cancels the job; this check covers races where the job
        // already started before cancel landed.
        const unread = data.audience === 'CUSTOMER' ? row?.userUnreadNotificationCount : row?.cookUnreadNotificationCount;
        if (!row || unread == null || unread <= 0) {
            return;
        }

        await bookingRequestOfferChatMessageNotifyEmailSend(serverRuntime, {
            bookingRequestOfferId: data.bookingRequestOfferId,
            audience: data.audience,
        });
    },
    options: {
        retryLimit: 3,
        retryDelay: 30,
        expireInSeconds: 300,
    },
};
