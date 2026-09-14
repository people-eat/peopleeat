import { eq } from 'drizzle-orm';

import { cookCallSlotBookings } from '../../db/schema';
import type { QueuedJobDefinition } from '../types';

const COMPLETE_GRACE_MS = 15 * 60_000;

interface BookingRequestOfferCallSlotsCompleteData {
    cookCallSlotBookingId: string;
}

/**
 * Completes a CONFIRMED slot past endAt+15m, or cancels a PENDING slot past
 * endAt. Enqueued per slot: PENDING at `endAt`, rescheduled to `endAt+15m` on
 * confirm. Handler no-ops when status no longer matches.
 */
export const bookingRequestOfferCallSlotsComplete: QueuedJobDefinition<BookingRequestOfferCallSlotsCompleteData> = {
    kind: 'queued',
    name: 'booking-request-offer-call-slots-complete',
    handler: async ({ data, serverRuntime }) => {
        const [row] = await serverRuntime.db
            .select({
                cookCallSlotBookingId: cookCallSlotBookings.cookCallSlotBookingId,
                userId: cookCallSlotBookings.userId,
                cookId: cookCallSlotBookings.cookId,
                status: cookCallSlotBookings.status,
                endAt: cookCallSlotBookings.endAt,
            })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, data.cookCallSlotBookingId))
            .limit(1);

        if (!row) {
            return;
        }

        const now = new Date();

        if (row.status === 'CONFIRMED') {
            if (row.endAt.getTime() + COMPLETE_GRACE_MS > now.getTime()) {
                return;
            }
            await serverRuntime.db
                .update(cookCallSlotBookings)
                .set({ status: 'COMPLETED', lastModifiedAt: now })
                .where(eq(cookCallSlotBookings.cookCallSlotBookingId, row.cookCallSlotBookingId));
        } else if (row.status === 'PENDING') {
            if (row.endAt.getTime() > now.getTime()) {
                return;
            }
            await serverRuntime.db
                .update(cookCallSlotBookings)
                .set({
                    status: 'CANCELED',
                    canceledReason: 'EXPIRED_UNCONFIRMED',
                    lastModifiedAt: now,
                })
                .where(eq(cookCallSlotBookings.cookCallSlotBookingId, row.cookCallSlotBookingId));
        } else {
            return;
        }

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: row.userId }),
            serverRuntime.publish.userUpdates({ userId: row.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);
    },
    options: {
        retryLimit: 1,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
