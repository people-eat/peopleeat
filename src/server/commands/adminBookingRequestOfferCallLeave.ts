import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferCallLeaveArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { bookingRequestOfferCallRoomParticipantLeft } from '../utils/bookingRequestOfferCallRoomParticipantLeft';

export async function adminBookingRequestOfferCallLeave(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferCallLeaveArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await bookingRequestOfferCallRoomParticipantLeft(serverRuntime, args.bookingRequestOfferCallRoomParticipantId, {
            actingUserId: adminId,
        });
        return { success: true, referenceId: args.bookingRequestOfferCallRoomParticipantId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
