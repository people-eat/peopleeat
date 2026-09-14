import { eq } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferCallJoinArgs,
    GqlSBookingRequestOfferCallTokenResult,
    GqlSSession,
} from '../graphql/generated';
import { bookingRequestOfferCallTokenIssue } from '../utils/bookingRequestOfferCallTokenIssue';

export async function adminBookingRequestOfferCallJoin(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferCallJoinArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSBookingRequestOfferCallTokenResult> {
    const { bookingRequestOfferId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!row) {
            throw new Error('adminBookingRequestOfferCallJoin: offer not found');
        }

        return await bookingRequestOfferCallTokenIssue(serverRuntime, {
            bookingRequestOfferId,
            actingUserId: adminId,
            sessionId: requestingSession.sessionId,
            mode: 'join',
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
