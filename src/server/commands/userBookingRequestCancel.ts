import { eq } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationBookingRequestCancelArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestCancelApply } from '../utils/bookingRequestCancelApply';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { userBookingRequestOwnedFindOne } from '../utils/userBookingRequestOwnedFindOne';

export async function userBookingRequestCancel(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestCancelArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const reason = args.reason.trim();
    if (reason.length === 0) {
        throw new Error('userBookingRequestCancel: reason must not be empty');
    }

    const { bookingRequestId } = args;

    try {
        const bookingRequest = await userBookingRequestOwnedFindOne(serverRuntime, userId, bookingRequestId);
        if (!bookingRequest) {
            throw new Error('userBookingRequestCancel: booking request not found');
        }

        const offers = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestId, bookingRequestId));

        await bookingRequestCancelApply(serverRuntime, { bookingRequest, offers, reason });
        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'BOOKING_REQUEST_CANCELED',
            payload: { bookingRequestId },
        });

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
