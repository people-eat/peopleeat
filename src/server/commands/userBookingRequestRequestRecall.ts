import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestRequestRecallArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyBookingRequestRecall } from '../slack/slackNotifyBooking';
import { userBookingRequestOwnedFindOne } from '../utils/userBookingRequestOwnedFindOne';

/**
 * Customer requests a callback during churn win-back. Notifies ops via Slack
 * thread and publishes adminUpdates so connected admin UIs refresh.
 */
export async function userBookingRequestRequestRecall(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestRequestRecallArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { bookingRequestId } = args;

    try {
        const bookingRequest = await userBookingRequestOwnedFindOne(serverRuntime, userId, bookingRequestId);
        if (!bookingRequest) {
            throw new Error('userBookingRequestRequestRecall: booking request not found');
        }

        const [user] = await serverRuntime.db
            .select({ phoneNumber: users.phoneNumber })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);

        serverRuntime.log.info(`bookingRequestRequestRecall bookingRequestId=${bookingRequestId} userId=${userId}`, requestingSession);

        await slackNotifyBookingRequestRecall(serverRuntime, {
            bookingRequestId,
            userId,
            phoneNumber: user?.phoneNumber ?? null,
        });

        await serverRuntime.publish.adminUpdates();

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
