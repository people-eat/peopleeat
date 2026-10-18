import { asc, eq, inArray } from 'drizzle-orm';

import {
    fileUploads,
    users,
    whatsAppConversations,
    whatsAppMessageAttachments,
    whatsAppMessageReactions,
    whatsAppMessages,
} from '../db/schema';
import type { WhatsAppMessageReaction } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { whatsappPhoneNumberUserMatchValues } from '../domain/whatsapp';
import type { GqlSHumanChatMessage, GqlSPublicUser } from '../graphql/generated';
import { toGqlWhatsAppMessages } from '../mappers/toGqlWhatsAppMessages';
import { publicUsersByIdFindMany } from '../utils/publicUserHydrate';

export async function whatsAppMessagesFindMany(
    input: { whatsAppConversationId: string },
    serverRuntime: ServerRuntime,
): Promise<GqlSHumanChatMessage[]> {
    const [conversation] = await serverRuntime.db
        .select()
        .from(whatsAppConversations)
        .where(eq(whatsAppConversations.whatsAppConversationId, input.whatsAppConversationId))
        .limit(1);

    if (!conversation) {
        return [];
    }

    const messageRows = await serverRuntime.db
        .select()
        .from(whatsAppMessages)
        .where(eq(whatsAppMessages.whatsAppConversationId, input.whatsAppConversationId))
        .orderBy(asc(whatsAppMessages.createdAt));

    const messageIds = messageRows.map((row) => row.whatsAppMessageId);
    const attachmentsByMessageId = new Map<string, Array<{ fileUploadId: string; filename: string; mediaType: string; size: number }>>();
    const reactionsByMessageId = new Map<string, WhatsAppMessageReaction[]>();

    if (messageIds.length > 0) {
        const attachmentRows = await serverRuntime.db
            .select({
                whatsAppMessageId: whatsAppMessageAttachments.whatsAppMessageId,
                fileUploadId: fileUploads.fileUploadId,
                filename: fileUploads.filename,
                mediaType: fileUploads.mediaType,
                size: fileUploads.size,
                position: whatsAppMessageAttachments.position,
            })
            .from(whatsAppMessageAttachments)
            .innerJoin(fileUploads, eq(fileUploads.fileUploadId, whatsAppMessageAttachments.fileUploadId))
            .where(inArray(whatsAppMessageAttachments.whatsAppMessageId, messageIds))
            .orderBy(asc(whatsAppMessageAttachments.position));

        for (const row of attachmentRows) {
            const list = attachmentsByMessageId.get(row.whatsAppMessageId) ?? [];
            list.push({
                fileUploadId: row.fileUploadId,
                filename: row.filename,
                mediaType: row.mediaType,
                size: row.size,
            });
            attachmentsByMessageId.set(row.whatsAppMessageId, list);
        }

        const reactionRows = await serverRuntime.db
            .select()
            .from(whatsAppMessageReactions)
            .where(inArray(whatsAppMessageReactions.whatsAppMessageId, messageIds))
            .orderBy(asc(whatsAppMessageReactions.createdAt));

        for (const row of reactionRows) {
            const list = reactionsByMessageId.get(row.whatsAppMessageId) ?? [];
            list.push(row);
            reactionsByMessageId.set(row.whatsAppMessageId, list);
        }
    }

    let customer: GqlSPublicUser = {
        display: conversation.displayName?.trim() || conversation.phoneNumber,
        createdAt: conversation.createdAt,
        profilePicture: null,
    };

    let matchedUserId = conversation.userId;
    if (!matchedUserId) {
        const [matched] = await serverRuntime.db
            .select({ userId: users.userId })
            .from(users)
            .where(inArray(users.phoneNumber, whatsappPhoneNumberUserMatchValues(conversation.phoneNumber)))
            .limit(1);
        matchedUserId = matched?.userId ?? null;
    }

    if (matchedUserId) {
        const byId = await publicUsersByIdFindMany(serverRuntime.db, [matchedUserId]);
        customer = byId.get(matchedUserId) ?? customer;
    }

    return toGqlWhatsAppMessages({ messages: messageRows, customer, attachmentsByMessageId, reactionsByMessageId });
}
