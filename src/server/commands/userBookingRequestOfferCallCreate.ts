import { and, eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSBookingRequestOfferCallTokenResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferCallCreateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferCallTokenIssue } from '../utils/bookingRequestOfferCallTokenIssue';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function userBookingRequestOfferCallCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferCallCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSBookingRequestOfferCallTokenResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'userBookingRequestOfferCallCreate');

    const { bookingRequestOfferId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferCallCreate: offer not found');
        }

        return await bookingRequestOfferCallTokenIssue(serverRuntime, {
            bookingRequestOfferId,
            actingUserId: userId,
            sessionId: requestingSession.sessionId,
            mode: 'create',
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
