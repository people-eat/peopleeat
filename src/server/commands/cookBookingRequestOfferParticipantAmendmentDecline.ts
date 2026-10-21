import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequestParticipants, bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferParticipantAmendmentDeclineArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferParticipantAmendmentDeclineEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { emailAddressPresent } from '../utils/emailAddressPresent';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function cookBookingRequestOfferParticipantAmendmentDecline(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferParticipantAmendmentDeclineArgs,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferParticipantAmendmentDecline');

    const { bookingRequestOfferId } = args;

    try {
        const enabled = await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT', serverRuntime, cookId);
        if (!enabled) {
            throw new Error('cookBookingRequestOfferParticipantAmendmentDecline: feature is disabled');
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
            throw new Error('cookBookingRequestOfferParticipantAmendmentDecline: offer not found');
        }

        const amendment = row.offer.participantAmendment;
        if (!amendment) {
            throw new Error('cookBookingRequestOfferParticipantAmendmentDecline: no pending amendment');
        }

        const existingParticipants = await serverRuntime.db
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, row.bookingRequest.bookingRequestId));

        const adultsBefore = existingParticipants.filter((p) => p.type === 'ADULT').length;
        const discountedBefore = existingParticipants.filter((p) => p.type === 'DISCOUNTED').length;
        const adultsAfter = amendment.participants.filter((p) => p.type === 'ADULT').length;
        const discountedAfter = amendment.participants.filter((p) => p.type === 'DISCOUNTED').length;

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    participantAmendment: null,
                    userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'COOK_PARTICIPANT_AMENDMENT_DECLINED',
                payload: {
                    participantsAdultBefore: adultsBefore,
                    participantsDiscountedBefore: discountedBefore,
                    participantsAdultAfter: adultsAfter,
                    participantsDiscountedAfter: discountedAfter,
                },
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        const [[customerRow], [cookRow]] = await Promise.all([
            serverRuntime.db.select().from(users).where(eq(users.userId, row.bookingRequest.userId)).limit(1),
            serverRuntime.db.select().from(users).where(eq(users.userId, cookId)).limit(1),
        ]);
        const customer = customerRow ? emailAddressPresent(customerRow) : null;
        const cook = cookRow ? emailAddressPresent(cookRow) : null;

        if (customer && cook) {
            await bookingRequestOfferParticipantAmendmentDeclineEmailSend(serverRuntime, {
                bookingRequest: row.bookingRequest,
                offer: row.offer,
                customer,
                cook,
            });
        }

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error);
        return { success: false };
    }
}
