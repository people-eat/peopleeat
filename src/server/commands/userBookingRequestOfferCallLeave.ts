import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferCallLeaveArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferCallRoomParticipantLeft } from '../utils/bookingRequestOfferCallRoomParticipantLeft';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function userBookingRequestOfferCallLeave(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferCallLeaveArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'userBookingRequestOfferCallLeave');

    try {
        await bookingRequestOfferCallRoomParticipantLeft(serverRuntime, args.bookingRequestOfferCallRoomParticipantId, {
            actingUserId: userId,
        });
        return { success: true, referenceId: args.bookingRequestOfferCallRoomParticipantId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
