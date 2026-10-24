import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferPreparationsCompleteArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferCanCompletePreparations } from '../utils/bookingRequestOfferParticipantAmendmentGates';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function cookBookingRequestOfferPreparationsComplete(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferPreparationsCompleteArgs,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferPreparationsComplete');

    const { bookingRequestOfferId } = args;

    try {
        const enabled = await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_PREPARATIONS_COMPLETE', serverRuntime, cookId);
        if (!enabled) {
            throw new Error('cookBookingRequestOfferPreparationsComplete: feature is disabled');
        }

        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferPreparationsComplete: offer not found');
        }

        if (
            !bookingRequestOfferCanCompletePreparations({
                offer: row.offer,
                bookingRequest: row.bookingRequest,
            })
        ) {
            throw new Error('cookBookingRequestOfferPreparationsComplete: preparations cannot be completed');
        }

        const completedAt = new Date();

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    preparationsCompletedAt: completedAt,
                    userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'COOK_PREPARATIONS_COMPLETED',
                payload: {},
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error);
        return { success: false };
    }
}
