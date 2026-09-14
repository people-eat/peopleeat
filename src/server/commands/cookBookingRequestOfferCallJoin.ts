import { and, eq } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSBookingRequestOfferCallTokenResult,
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferCallJoinArgs,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferCallTokenIssue } from '../utils/bookingRequestOfferCallTokenIssue';

export async function cookBookingRequestOfferCallJoin(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferCallJoinArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSBookingRequestOfferCallTokenResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const { bookingRequestOfferId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferCallJoin: offer not found');
        }

        return await bookingRequestOfferCallTokenIssue(serverRuntime, {
            bookingRequestOfferId,
            actingUserId: cookId,
            sessionId: requestingSession.sessionId,
            mode: 'join',
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
