import { eq, inArray } from 'drizzle-orm';

import type { FileUploadMetadata } from '../db/fileUploadMetadata';
import { fileUploadMetadataColumns } from '../db/fileUploadMetadata';
import { admins, chatMessageUserAttachments, fileUploads } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChatTurn, GqlSSession } from '../graphql/generated';
import { chatTurnAggregateFindMany, chatTurnAggregateFindManyByChatId } from '../lib/chatTurnAggregateFindMany';
import { chatDebugEnabled, toGqlChatTurn } from '../mappers/toGqlChatTurn';

/** Field resolver for `Chat.turns` / `AdminAssistantChat.turns`. */
export async function chatTurnsFindMany(
    parent: { chatId: string },
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    options?: { skipOwnershipCheck?: boolean },
): Promise<GqlSChatTurn[]> {
    try {
        let isAdmin = false;
        if (requestingSession.userId) {
            const [adminRow] = await serverRuntime.db
                .select({ adminId: admins.adminId })
                .from(admins)
                .where(eq(admins.adminId, requestingSession.userId))
                .limit(1);
            isAdmin = Boolean(adminRow);
        }
        const includeDebug = chatDebugEnabled() || isAdmin;
        const aggregates = options?.skipOwnershipCheck
            ? await chatTurnAggregateFindManyByChatId(serverRuntime, parent.chatId)
            : await chatTurnAggregateFindMany(serverRuntime, parent.chatId, requestingSession.userId!);

        const userMessageIds = aggregates.map((a) => a.userMessage.chatMessageId);
        const attachmentsByMessageId = new Map<string, FileUploadMetadata[]>();
        if (userMessageIds.length > 0) {
            const attachmentRows = await serverRuntime.db
                .select({
                    chatMessageId: chatMessageUserAttachments.chatMessageId,
                    ...fileUploadMetadataColumns,
                })
                .from(chatMessageUserAttachments)
                .innerJoin(fileUploads, eq(fileUploads.fileUploadId, chatMessageUserAttachments.fileUploadId))
                .where(inArray(chatMessageUserAttachments.chatMessageId, userMessageIds))
                .orderBy(chatMessageUserAttachments.position);
            for (const row of attachmentRows) {
                const list = attachmentsByMessageId.get(row.chatMessageId) ?? [];
                list.push({
                    fileUploadId: row.fileUploadId,
                    filename: row.filename,
                    mediaType: row.mediaType,
                    size: row.size,
                });
                attachmentsByMessageId.set(row.chatMessageId, list);
            }
        }

        return aggregates.map((aggregate) =>
            toGqlChatTurn(aggregate, {
                includeDebug,
                userAttachments: attachmentsByMessageId.get(aggregate.userMessage.chatMessageId) ?? [],
            }),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
