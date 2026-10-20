import { eq } from 'drizzle-orm';

import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferChatMessageDeleteArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';

export async function adminBookingRequestOfferChatMessageDelete(
    _parent: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferChatMessageDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const { bookingRequestOfferEventId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({
                event: bookingRequestOfferEvents,
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(bookingRequestOfferEvents)
            .innerJoin(
                bookingRequestOffers,
                eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferEvents.bookingRequestOfferId),
            )
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, bookingRequestOfferEventId))
            .limit(1);

        if (!row) {
            throw new Error('adminBookingRequestOfferChatMessageDelete: message not found');
        }
        if (row.event.type !== 'ADMIN_MESSAGE_SIMPLE') {
            throw new Error('adminBookingRequestOfferChatMessageDelete: only admin messages can be permanently deleted');
        }

        await serverRuntime.db
            .delete(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, bookingRequestOfferEventId));

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferEventId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
