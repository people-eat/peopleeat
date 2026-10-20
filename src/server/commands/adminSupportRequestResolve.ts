import { eq, sql } from 'drizzle-orm';

import { supportRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationSupportRequestResolveArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { slackNotifySupportRequestResolved } from '../slack/slackNotifyAdjacent';
import { supportRequestCustomerReplyNotifyCancel } from '../utils/supportRequestCustomerReplyNotifySchedule';
import { adminSupportRequestResolveEmailSend } from '../utils/supportRequestLifecycleEmails';

export async function adminSupportRequestResolve(
    _parent: GqlSAdminMutation,
    args: GqlSAdminMutationSupportRequestResolveArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const { supportRequestId } = args;
    const notifyCustomer = args.notifyCustomer !== false;

    try {
        const [supportRequest] = await serverRuntime.db
            .select()
            .from(supportRequests)
            .where(eq(supportRequests.supportRequestId, supportRequestId))
            .limit(1);

        if (!supportRequest) {
            throw new Error('adminSupportRequestResolve: support request not found');
        }

        if (supportRequest.status !== 'RESOLVED') {
            await serverRuntime.db
                .update(supportRequests)
                .set({
                    status: 'RESOLVED',
                    resolvedAt: new Date(),
                    adminUnreadNotificationCount: 0,
                    ...(notifyCustomer ? { userUnreadNotificationCount: sql`${supportRequests.userUnreadNotificationCount} + 1` } : {}),
                })
                .where(eq(supportRequests.supportRequestId, supportRequestId));

            await supportRequestCustomerReplyNotifyCancel(serverRuntime, {
                supportRequestId,
                customerReplyNotifyJobId: supportRequest.customerReplyNotifyJobId,
            });

            await Promise.all([serverRuntime.publish.userUpdates({ userId: supportRequest.userId }), serverRuntime.publish.adminUpdates()]);
            if (notifyCustomer) {
                await adminSupportRequestResolveEmailSend(serverRuntime, { supportRequestId });
            }

            const [customer] = await serverRuntime.db
                .select({ firstName: users.firstName, lastName: users.lastName })
                .from(users)
                .where(eq(users.userId, supportRequest.userId))
                .limit(1);

            await slackNotifySupportRequestResolved(serverRuntime, {
                supportRequestId,
                customerName: customer ? `${customer.firstName} ${customer.lastName}` : supportRequest.userId,
                subject: supportRequest.subject,
            });
        }

        return { success: true, referenceId: supportRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
