import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import { bookingRequests, supportRequestMessageAttachments, supportRequestMessages, supportRequests, users } from '../db/schema';
import type { SupportRequestMessageAttachmentCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationSupportRequestCreateArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifySupportRequestCreate } from '../slack/slackNotifyAdjacent';
import { fileUploadIdsAssertOwned } from '../utils/fileUploadIdsAssertOwned';
import { userSupportRequestCreateEmailSend } from '../utils/supportRequestLifecycleEmails';

export async function userSupportRequestCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationSupportRequestCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const subject = textNormalizeTitled(args.subject);
    const messageBody = textNormalizeProseTitled(args.messageBody);
    if (subject.length === 0) {
        throw new Error('userSupportRequestCreate: subject must not be empty');
    }
    if (messageBody.length === 0) {
        throw new Error('userSupportRequestCreate: messageBody must not be empty');
    }

    const bookingRequestId = args.bookingRequestId?.trim() || null;
    const requestedFileUploadIds = Array.from(new Set(args.fileUploadIds ?? []));
    const supportRequestId = idCreate();
    const supportRequestMessageId = idCreate();

    try {
        const fileUploadIds = await fileUploadIdsAssertOwned(serverRuntime.db, {
            userId,
            fileUploadIds: requestedFileUploadIds,
            commandName: 'userSupportRequestCreate',
        });

        if (bookingRequestId) {
            const [bookingRequest] = await serverRuntime.db
                .select({ bookingRequestId: bookingRequests.bookingRequestId })
                .from(bookingRequests)
                .where(and(eq(bookingRequests.bookingRequestId, bookingRequestId), eq(bookingRequests.userId, userId)))
                .limit(1);

            if (!bookingRequest) {
                throw new Error('userSupportRequestCreate: booking request not found');
            }

            const [existing] = await serverRuntime.db
                .select({ supportRequestId: supportRequests.supportRequestId })
                .from(supportRequests)
                .where(eq(supportRequests.bookingRequestId, bookingRequestId))
                .limit(1);

            if (existing) {
                throw new Error('userSupportRequestCreate: booking request already has a support request');
            }
        }

        const attachmentJoins: SupportRequestMessageAttachmentCreate[] = fileUploadIds.map((fileUploadId, position) => ({
            supportRequestMessageId,
            fileUploadId,
            position,
        }));

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(supportRequests).values({
                supportRequestId,
                userId,
                bookingRequestId,
                subject,
                status: 'OPEN',
                userUnreadNotificationCount: 0,
                adminUnreadNotificationCount: 1,
            });

            await transaction.insert(supportRequestMessages).values({
                supportRequestMessageId,
                supportRequestId,
                authorUserId: userId,
                body: messageBody,
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

        await Promise.all([
            userSupportRequestCreateEmailSend(serverRuntime, { supportRequestId }),
            slackNotifySupportRequestCreate(serverRuntime, {
                supportRequestId,
                userId,
                customerName: user ? `${user.firstName} ${user.lastName}` : userId,
                subject,
                bodyPreview: messageBody.slice(0, 500),
            }),
        ]);

        return { success: true, referenceId: supportRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
