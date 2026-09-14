import { eq } from 'drizzle-orm';

import { supportRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationSupportRequestUnreadNotificationCountResetArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';

export async function adminSupportRequestUnreadNotificationCountReset(
    _parent: GqlSAdminMutation,
    args: GqlSAdminMutationSupportRequestUnreadNotificationCountResetArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const { supportRequestId } = args;

    try {
        const [supportRequest] = await serverRuntime.db
            .select()
            .from(supportRequests)
            .where(eq(supportRequests.supportRequestId, supportRequestId))
            .limit(1);

        if (!supportRequest) {
            throw new Error('adminSupportRequestUnreadNotificationCountReset: support request not found');
        }

        if (supportRequest.adminUnreadNotificationCount > 0) {
            await serverRuntime.db
                .update(supportRequests)
                .set({ adminUnreadNotificationCount: 0 })
                .where(eq(supportRequests.supportRequestId, supportRequestId));

            await Promise.all([serverRuntime.publish.userUpdates({ userId: supportRequest.userId }), serverRuntime.publish.adminUpdates()]);
        }

        return { success: true, referenceId: supportRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
