import { and, eq, sql } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferParticipantAmendmentCancelArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferIsDualAccepted } from '../utils/bookingRequestOfferParticipantAmendmentGates';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function userBookingRequestOfferParticipantAmendmentCancel(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferParticipantAmendmentCancelArgs,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { bookingRequestOfferId } = args;

    try {
        const enabled = await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT', serverRuntime, userId);
        if (!enabled) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCancel: feature is disabled');
        }

        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCancel: offer not found');
        }
        if (!bookingRequestOfferIsDualAccepted(row.offer)) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCancel: offer is not dual-accepted');
        }
        if (row.offer.participantAmendment == null) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCancel: no pending amendment');
        }
        if (row.offer.participantAmendment.claimedAt) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCancel: amendment is already being applied');
        }

        await serverRuntime.db.transaction(async (transaction) => {
            const cleared = await transaction
                .update(bookingRequestOffers)
                .set({
                    participantAmendment: null,
                    cookUnreadNotificationCount: sql`${bookingRequestOffers.cookUnreadNotificationCount} + 1`,
                })
                .where(
                    and(
                        eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId),
                        sql`${bookingRequestOffers.participantAmendment} IS NOT NULL`,
                        sql`(${bookingRequestOffers.participantAmendment}->>'claimedAt') IS NULL`,
                    ),
                )
                .returning({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId });

            if (cleared.length === 0) {
                throw new Error('userBookingRequestOfferParticipantAmendmentCancel: amendment is already being applied');
            }

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'USER_PARTICIPANT_AMENDMENT_CANCELED',
                payload: {},
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error);
        return { success: false };
    }
}
