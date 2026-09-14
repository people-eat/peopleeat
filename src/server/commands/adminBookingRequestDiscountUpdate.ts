import { eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestDiscountUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { applyDiscountToBookingRequest, clearDiscountOnBookingRequest } from '../utils/applyDiscountToBookingRequest';

export async function adminBookingRequestDiscountUpdate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestDiscountUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestId = args.bookingRequestId.trim();
    if (bookingRequestId.length === 0) {
        throw new Error('adminBookingRequestDiscountUpdate: bookingRequestId must not be empty');
    }

    const redeemCode = args.redeemCode?.trim() || null;

    try {
        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId))
            .limit(1);

        if (!bookingRequest) {
            throw new Error('adminBookingRequestDiscountUpdate: booking request not found');
        }

        const { userId } = bookingRequest;

        if (redeemCode) {
            const applied = await applyDiscountToBookingRequest(serverRuntime, userId, bookingRequestId, redeemCode);
            if (!applied) {
                throw new Error('adminBookingRequestDiscountUpdate: redeem code could not be applied');
            }

            await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
            return { success: true, referenceId: redeemCode };
        }

        const cleared = await clearDiscountOnBookingRequest(serverRuntime, userId, bookingRequestId);
        if (!cleared) {
            throw new Error('adminBookingRequestDiscountUpdate: could not clear discount');
        }

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
