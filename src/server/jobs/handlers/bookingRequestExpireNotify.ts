import { and, eq, sql } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../../db/schema';
import {
    bookingRequestOfferPendingCallSlotsClose,
    bookingRequestOfferPendingCallSlotsCompleteJobsCancel,
} from '../../utils/bookingRequestOfferPendingCallSlotsClose';
import type { QueuedJobDefinition } from '../types';

interface BookingRequestExpireNotifyData {
    bookingRequestId: string;
}

/**
 * When a booking request crosses `expiresAt`, closes PENDING call slots on its
 * offers and publishes updates so customer / cook UIs refresh derived EXPIRED
 * status. Offer/request status itself is derived — this job wakes subscriptions
 * and cleans slot rows. Enqueued with `startAfter: expiresAt`.
 */
export const bookingRequestExpireNotify: QueuedJobDefinition<BookingRequestExpireNotifyData> = {
    kind: 'queued',
    name: 'booking-request-expire-notify',
    handler: async ({ data, serverRuntime }) => {
        const [row] = await serverRuntime.db
            .select({
                bookingRequestId: bookingRequests.bookingRequestId,
                userId: bookingRequests.userId,
                expiresAt: bookingRequests.expiresAt,
                canceledAt: bookingRequests.canceledAt,
            })
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, data.bookingRequestId))
            .limit(1);

        if (!row || row.canceledAt != null || row.expiresAt == null) {
            return;
        }

        if (row.expiresAt.getTime() > Date.now()) {
            return;
        }

        const [dualAccepted] = await serverRuntime.db
            .select({ one: sql`1` })
            .from(bookingRequestOffers)
            .where(
                and(
                    eq(bookingRequestOffers.bookingRequestId, row.bookingRequestId),
                    eq(bookingRequestOffers.userAccepted, true),
                    eq(bookingRequestOffers.cookAccepted, true),
                ),
            )
            .limit(1);

        if (dualAccepted) {
            return;
        }

        const cookRows = await serverRuntime.db
            .select({
                cookId: bookingRequestOffers.cookId,
                bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestId, row.bookingRequestId));

        const offerIds = cookRows.map((cookRow) => cookRow.bookingRequestOfferId);
        const now = new Date();
        const closedCallSlotBookingIds = await serverRuntime.db.transaction(async (transaction) =>
            bookingRequestOfferPendingCallSlotsClose(transaction, {
                bookingRequestOfferIds: offerIds,
                reason: { kind: 'BOOKING_REQUEST_EXPIRED' },
                now,
            }),
        );

        await bookingRequestOfferPendingCallSlotsCompleteJobsCancel(serverRuntime, closedCallSlotBookingIds);

        const publishUserIds = new Set<string>([row.userId]);
        for (const cookRow of cookRows) {
            publishUserIds.add(cookRow.cookId);
        }

        await Promise.all([...publishUserIds].map((userId) => serverRuntime.publish.userUpdates({ userId })));
        await serverRuntime.publish.adminUpdates();
    },
    options: {
        retryLimit: 1,
        retryDelay: 60,
        expireInSeconds: 300,
    },
};
