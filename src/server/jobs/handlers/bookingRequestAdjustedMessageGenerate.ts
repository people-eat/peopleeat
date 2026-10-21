import { eq } from 'drizzle-orm';

import { bookingRequestAdjustedMessageGenerate as bookingRequestAdjustedMessageGenerateRun } from '../../commands/bookingRequestAdjustedMessageGenerate';
import { bookingRequests } from '../../db/schema';
import { featureToggleIsEnabled } from '../../utils/featureToggleIsEnabled';
import type { QueuedJobDefinition } from '../types';

export interface BookingRequestAdjustedMessageGenerateData {
    bookingRequestId: string;
}

export const bookingRequestAdjustedMessageGenerate: QueuedJobDefinition<BookingRequestAdjustedMessageGenerateData> = {
    kind: 'queued',
    name: 'booking-request-adjusted-message-generate',
    handler: async ({ data, serverRuntime }) => {
        try {
            const [bookingRequest] = await serverRuntime.db
                .select({ userId: bookingRequests.userId })
                .from(bookingRequests)
                .where(eq(bookingRequests.bookingRequestId, data.bookingRequestId))
                .limit(1);

            if (!bookingRequest) {
                serverRuntime.log.warn(`bookingRequestAdjustedMessageGenerate: booking request ${data.bookingRequestId} not found`);
                return;
            }

            const enabled = await featureToggleIsEnabled('AI_BOOKING_REQUEST_MESSAGE', serverRuntime, bookingRequest.userId);
            if (!enabled) {
                return;
            }

            await bookingRequestAdjustedMessageGenerateRun({
                bookingRequestId: data.bookingRequestId,
                requestingSession: null,
                serverRuntime,
            });
        } catch (error) {
            serverRuntime.log.error(error, null);
        }
    },
    options: {
        retryLimit: 2,
        retryDelay: 30,
        expireInSeconds: 120,
    },
};
