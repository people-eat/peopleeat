import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferCallLeaveArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';
import { bookingRequestOfferCallRoomParticipantLeft } from '../utils/bookingRequestOfferCallRoomParticipantLeft';

export async function cookBookingRequestOfferCallLeave(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferCallLeaveArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferCallLeave');

    try {
        await bookingRequestOfferCallRoomParticipantLeft(serverRuntime, args.bookingRequestOfferCallRoomParticipantId, {
            actingUserId: cookId,
        });
        return { success: true, referenceId: args.bookingRequestOfferCallRoomParticipantId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
