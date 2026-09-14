import { and, eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSBookingRequestOfferCallTokenResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferCallJoinArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferCallTokenIssue } from '../utils/bookingRequestOfferCallTokenIssue';

export async function userBookingRequestOfferCallJoin(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferCallJoinArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSBookingRequestOfferCallTokenResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { bookingRequestOfferId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferCallJoin: offer not found');
        }

        return await bookingRequestOfferCallTokenIssue(serverRuntime, {
            bookingRequestOfferId,
            actingUserId: userId,
            sessionId: requestingSession.sessionId,
            mode: 'join',
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
