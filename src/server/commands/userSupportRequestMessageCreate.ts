import { and, eq, sql } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled } from '../../shared/textNormalize';
import { supportRequestMessageAttachments, supportRequestMessages, supportRequests, users } from '../db/schema';
import type { SupportRequestMessageAttachmentCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationSupportRequestMessageCreateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifySupportRequestMessage } from '../slack/slackNotifyAdjacent';
import { fileUploadIdsAssertOwned } from '../utils/fileUploadIdsAssertOwned';

export async function userSupportRequestMessageCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationSupportRequestMessageCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const message = textNormalizeProseTitled(args.message);
    const requestedFileUploadIds = Array.from(new Set(args.fileUploadIds ?? []));
    if (message.length === 0 && requestedFileUploadIds.length === 0) {
        throw new Error('userSupportRequestMessageCreate: message must not be empty');
    }

    const { supportRequestId } = args;
    const supportRequestMessageId = idCreate();

    try {
        const fileUploadIds = await fileUploadIdsAssertOwned(serverRuntime.db, {
            userId,
            fileUploadIds: requestedFileUploadIds,
            commandName: 'userSupportRequestMessageCreate',
        });

        const [supportRequest] = await serverRuntime.db
            .select()
            .from(supportRequests)
            .where(and(eq(supportRequests.supportRequestId, supportRequestId), eq(supportRequests.userId, userId)))
            .limit(1);

        if (!supportRequest) {
            throw new Error('userSupportRequestMessageCreate: support request not found');
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
                    adminUnreadNotificationCount: sql`${supportRequests.adminUnreadNotificationCount} + 1`,
                    status: 'OPEN',
                    resolvedAt: null,
                })
                .where(eq(supportRequests.supportRequestId, supportRequestId));

            await transaction.insert(supportRequestMessages).values({
                supportRequestMessageId,
                supportRequestId,
                authorUserId: userId,
                body: message,
            });

            if (attachmentJoins.length > 0) {
                await transaction.insert(supportRequestMessageAttachments).values(attachmentJoins);
            }
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);

        const [user] = await serverRuntime.db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);

        await slackNotifySupportRequestMessage(serverRuntime, {
            supportRequestId,
            customerName: user ? `${user.firstName} ${user.lastName}` : userId,
            bodyPreview: (message || '(Anhang)').slice(0, 500),
            from: 'customer',
        });

        return { success: true, referenceId: supportRequestMessageId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
