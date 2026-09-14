import { eq, sql } from 'drizzle-orm';

import { capitalizeFirstLetter } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import type { SupportRequestMessageAttachmentCreate } from '../db/schema';
import { supportRequestMessageAttachments, supportRequestMessages, supportRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationSupportRequestMessageCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { slackNotifySupportRequestMessage } from '../slack/slackNotifyAdjacent';
import { fileUploadIdsAssertOwned } from '../utils/fileUploadIdsAssertOwned';
import { supportRequestCustomerReplyNotifySchedule } from '../utils/supportRequestCustomerReplyNotifySchedule';

export async function adminSupportRequestMessageCreate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationSupportRequestMessageCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const message = capitalizeFirstLetter(args.message.trim());
    const requestedFileUploadIds = Array.from(new Set(args.fileUploadIds ?? []));
    if (message.length === 0 && requestedFileUploadIds.length === 0) {
        throw new Error('adminSupportRequestMessageCreate: message must not be empty');
    }

    const { supportRequestId } = args;
    const supportRequestMessageId = idCreate();

    try {
        const fileUploadIds = await fileUploadIdsAssertOwned(serverRuntime.db, {
            userId: adminId,
            fileUploadIds: requestedFileUploadIds,
            commandName: 'adminSupportRequestMessageCreate',
        });

        const [supportRequest] = await serverRuntime.db
            .select()
            .from(supportRequests)
            .where(eq(supportRequests.supportRequestId, supportRequestId))
            .limit(1);

        if (!supportRequest) {
            throw new Error('adminSupportRequestMessageCreate: support request not found');
        }

        const attachmentJoins: SupportRequestMessageAttachmentCreate[] = fileUploadIds.map((fileUploadId, position) => ({
            supportRequestMessageId,
            fileUploadId,
            position,
        }));

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(supportRequests)
                .set({
                    userUnreadNotificationCount: sql`${supportRequests.userUnreadNotificationCount} + 1`,
                })
                .where(eq(supportRequests.supportRequestId, supportRequestId));

            await transaction.insert(supportRequestMessages).values({
                supportRequestMessageId,
                supportRequestId,
                authorUserId: adminId,
                body: message,
            });

            if (attachmentJoins.length > 0) {
                await transaction.insert(supportRequestMessageAttachments).values(attachmentJoins);
            }
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId: supportRequest.userId }), serverRuntime.publish.adminUpdates()]);
        await supportRequestCustomerReplyNotifySchedule(serverRuntime, {
            supportRequestId,
            customerReplyNotifyJobId: supportRequest.customerReplyNotifyJobId,
        });

        const [customer] = await serverRuntime.db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.userId, supportRequest.userId))
            .limit(1);

        await slackNotifySupportRequestMessage(serverRuntime, {
            supportRequestId,
            customerName: customer ? `${customer.firstName} ${customer.lastName}` : supportRequest.userId,
            bodyPreview: (message || '(Anhang)').slice(0, 500),
            from: 'admin',
        });

        return { success: true, referenceId: supportRequestMessageId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
