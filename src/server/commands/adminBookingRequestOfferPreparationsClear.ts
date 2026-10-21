import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferPreparationsClearArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';

export async function adminBookingRequestOfferPreparationsClear(
    _parent: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferPreparationsClearArgs,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const { bookingRequestOfferId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!row) {
            throw new Error('adminBookingRequestOfferPreparationsClear: offer not found');
        }

        if (row.offer.preparationsCompletedAt == null) {
            return { success: true, referenceId: bookingRequestOfferId };
        }

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({ preparationsCompletedAt: null })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'ADMIN_PREPARATIONS_CLEARED',
                payload: {},
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error);
        return { success: false };
    }
}
