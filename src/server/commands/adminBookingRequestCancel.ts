import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationBookingRequestCancelArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestCancelApply } from '../utils/bookingRequestCancelApply';

export async function adminBookingRequestCancel(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestCancelArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const reason = args.reason.trim();
    if (reason.length === 0) {
        throw new Error('adminBookingRequestCancel: reason must not be empty');
    }

    const bookingRequestId = args.bookingRequestId.trim();
    if (bookingRequestId.length === 0) {
        throw new Error('adminBookingRequestCancel: bookingRequestId must not be empty');
    }

    try {
        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId))
            .limit(1);

        if (!bookingRequest) {
            throw new Error('adminBookingRequestCancel: booking request not found');
        }

        const offers = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestId, bookingRequestId));

        await bookingRequestCancelApply(serverRuntime, { bookingRequest, offers, reason });

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
