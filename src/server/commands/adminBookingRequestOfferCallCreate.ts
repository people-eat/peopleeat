import { eq } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferCallCreateArgs,
    GqlSBookingRequestOfferCallTokenResult,
    GqlSSession,
} from '../graphql/generated';
import { bookingRequestOfferCallTokenIssue } from '../utils/bookingRequestOfferCallTokenIssue';

export async function adminBookingRequestOfferCallCreate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferCallCreateArgs,
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
            throw new Error('adminBookingRequestOfferCallCreate: offer not found');
        }

        return await bookingRequestOfferCallTokenIssue(serverRuntime, {
            bookingRequestOfferId,
            actingUserId: adminId,
            sessionId: requestingSession.sessionId,
            mode: 'create',
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
