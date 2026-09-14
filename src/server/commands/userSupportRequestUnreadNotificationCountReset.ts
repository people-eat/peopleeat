import { and, eq } from 'drizzle-orm';

import { supportRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationSupportRequestUnreadNotificationCountResetArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { supportRequestCustomerReplyNotifyCancel } from '../utils/supportRequestCustomerReplyNotifySchedule';

export async function userSupportRequestUnreadNotificationCountReset(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationSupportRequestUnreadNotificationCountResetArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { supportRequestId } = args;

    try {
        const [supportRequest] = await serverRuntime.db
            .select()
            .from(supportRequests)
            .where(and(eq(supportRequests.supportRequestId, supportRequestId), eq(supportRequests.userId, userId)))
            .limit(1);

        if (!supportRequest) {
            throw new Error('userSupportRequestUnreadNotificationCountReset: support request not found');
        }

        if (supportRequest.userUnreadNotificationCount > 0 || supportRequest.customerReplyNotifyJobId != null) {
            await serverRuntime.db
                .update(supportRequests)
                .set({ userUnreadNotificationCount: 0 })
                .where(eq(supportRequests.supportRequestId, supportRequestId));

            await supportRequestCustomerReplyNotifyCancel(serverRuntime, {
                supportRequestId,
                customerReplyNotifyJobId: supportRequest.customerReplyNotifyJobId,
            });

            await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
        }

        return { success: true, referenceId: supportRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
