import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferDeclineArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyOfferDecline } from '../slack/slackNotifyBooking';
import { userBookingRequestOfferDeclineEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferNegotiationAssert } from '../utils/bookingRequestOfferNegotiationAssert';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function userBookingRequestOfferDecline(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferDeclineArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'userBookingRequestOfferDecline');

    const reason = args.reason.trim();
    if (reason.length === 0) {
        throw new Error('userBookingRequestOfferDecline: reason must not be empty');
    }

    const { bookingRequestOfferId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferDecline: offer not found');
        }

        bookingRequestOfferNegotiationAssert(row.offer);

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    userAccepted: false,
                    userDeclinationReason: reason,
                    cookUnreadNotificationCount: row.offer.cookUnreadNotificationCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'USER_DECLINED',
                payload: { reason },
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        await userBookingRequestOfferDeclineEmailSend(serverRuntime, {
            bookingRequestOfferId,
            customerUserId: userId,
            cookId: row.offer.cookId,
            reason,
        });

        const [customer] = await serverRuntime.db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);

        await slackNotifyOfferDecline(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId,
            actor: 'customer',
            name: customer ? `${customer.firstName} ${customer.lastName}` : userId,
            reason,
        });

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'BOOKING_REQUEST_OFFER_DECLINED',
            payload: {
                bookingRequestId: row.bookingRequest.bookingRequestId,
                bookingRequestOfferId,
                actor: 'customer',
            },
        });

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
