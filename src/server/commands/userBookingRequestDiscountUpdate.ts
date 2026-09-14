import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestDiscountUpdateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { applyDiscountToBookingRequest, clearDiscountOnBookingRequest } from '../utils/applyDiscountToBookingRequest';

export async function userBookingRequestDiscountUpdate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestDiscountUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const bookingRequestId = args.bookingRequestId;
    const redeemCode = args.redeemCode?.trim() || null;

    try {
        if (redeemCode) {
            const applied = await applyDiscountToBookingRequest(serverRuntime, userId, bookingRequestId, redeemCode);
            if (!applied) {
                throw new Error('userBookingRequestDiscountUpdate: redeem code could not be applied');
            }

            await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
            return { success: true, referenceId: redeemCode };
        }

        const cleared = await clearDiscountOnBookingRequest(serverRuntime, userId, bookingRequestId);
        if (!cleared) {
            throw new Error('userBookingRequestDiscountUpdate: could not clear discount');
        }

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
