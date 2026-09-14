import { asc, eq, inArray } from 'drizzle-orm';

import { supportRequestMessages, supportRequests, users } from '../db/schema';
import { supportMessageAttachmentsByMessageIdLoad } from '../db/supportMessageAttachmentsLoad';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSHumanChatMessage, GqlSPublicUser } from '../graphql/generated';
import { toGqlPublicUser } from '../mappers/toGqlPublicUser';
import { toGqlSupportRequestMessages } from '../mappers/toGqlSupportRequestMessages';
import type { SupportChatViewerRole } from '../mappers/toGqlSupportRequestMessages';

export async function supportRequestMessagesFindMany(
    input: {
        supportRequestId: string;
        viewerRole: SupportChatViewerRole;
    },
    serverRuntime: ServerRuntime,
): Promise<GqlSHumanChatMessage[]> {
    const [supportRequest] = await serverRuntime.db
        .select({ userId: supportRequests.userId })
        .from(supportRequests)
        .where(eq(supportRequests.supportRequestId, input.supportRequestId))
        .limit(1);

    if (!supportRequest) {
        return [];
    }

    const messageRows = await serverRuntime.db
        .select()
        .from(supportRequestMessages)
        .where(eq(supportRequestMessages.supportRequestId, input.supportRequestId))
        .orderBy(asc(supportRequestMessages.createdAt));

    if (messageRows.length === 0) {
        return [];
    }

    const authorIds = [...new Set([...messageRows.map((row) => row.authorUserId), supportRequest.userId])];
    const authorRows = await serverRuntime.db
        .select({ userId: users.userId, firstName: users.firstName, createdAt: users.createdAt })
        .from(users)
        .where(inArray(users.userId, authorIds));

    const authorsByUserId = new Map(authorRows.map((row) => [row.userId, row]));
    const customerRow = authorsByUserId.get(supportRequest.userId);
    const customer: GqlSPublicUser = customerRow
        ? toGqlPublicUser(customerRow, null)
        : { display: 'Customer', createdAt: new Date(0), profilePicture: null };

    const attachmentsByMessageId = await supportMessageAttachmentsByMessageIdLoad(
        serverRuntime.db,
        messageRows.map((row) => row.supportRequestMessageId),
    );

    return toGqlSupportRequestMessages({
        messages: messageRows,
        customerUserId: supportRequest.userId,
        customer,
        viewerRole: input.viewerRole,
        authorsByUserId,
        attachmentsByMessageId,
    });
}
