import { and, eq } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferUnreadNotificationCountResetArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferChatMessageNotifyCancel } from '../utils/bookingRequestOfferChatMessageNotifySchedule';

export async function cookBookingRequestOfferUnreadNotificationCountReset(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferUnreadNotificationCountResetArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const { bookingRequestOfferId } = args;

    try {
        const [offer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!offer) {
            throw new Error('cookBookingRequestOfferUnreadNotificationCountReset: offer not found');
        }

        if (offer.cookUnreadNotificationCount > 0 || offer.cookChatMessageNotifyJobId != null) {
            await serverRuntime.db
                .update(bookingRequestOffers)
                .set({ cookUnreadNotificationCount: 0 })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await bookingRequestOfferChatMessageNotifyCancel(serverRuntime, {
                bookingRequestOfferId,
                audience: 'COOK',
                existingJobId: offer.cookChatMessageNotifyJobId,
            });

            await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        }
        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
