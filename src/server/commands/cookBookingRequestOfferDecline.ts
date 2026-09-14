import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferDeclineArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyOfferDecline } from '../slack/slackNotifyBooking';
import { bookingRequestOfferNegotiationAssert } from '../utils/bookingRequestOfferNegotiationAssert';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function cookBookingRequestOfferDecline(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferDeclineArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferDecline');

    const reason = args.reason.trim();
    if (reason.length === 0) {
        throw new Error('cookBookingRequestOfferDecline: reason must not be empty');
    }

    const { bookingRequestOfferId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferDecline: offer not found');
        }

        bookingRequestOfferNegotiationAssert(row.offer);

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    cookAccepted: false,
                    cookDeclinationReason: reason,
                    userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'COOK_DECLINED',
                payload: {},
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        const [cookUser] = await serverRuntime.db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.userId, cookId))
            .limit(1);

        await slackNotifyOfferDecline(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId,
            actor: 'cook',
            name: cookUser ? `${cookUser.firstName} ${cookUser.lastName}` : cookId,
            reason,
        });

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
