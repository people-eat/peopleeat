import { and, eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferUnreadNotificationCountResetArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferChatMessageNotifyCancel } from '../utils/bookingRequestOfferChatMessageNotifySchedule';

export async function userBookingRequestOfferUnreadNotificationCountReset(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferUnreadNotificationCountResetArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { bookingRequestOfferId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferUnreadNotificationCountReset: offer not found');
        }

        if (row.offer.userUnreadNotificationCount > 0 || row.offer.customerChatMessageNotifyJobId != null) {
            await serverRuntime.db
                .update(bookingRequestOffers)
                .set({ userUnreadNotificationCount: 0 })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await bookingRequestOfferChatMessageNotifyCancel(serverRuntime, {
                bookingRequestOfferId,
                audience: 'CUSTOMER',
                existingJobId: row.offer.customerChatMessageNotifyJobId,
            });

            await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
        }

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
