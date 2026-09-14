import { and, eq, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { ChatCreate, ChatMessageUserAttachmentCreate } from '../db/schema';
import { chatMessages, chatMessageUserAttachments, chats, chatTurns, fileUploads } from '../db/schema';
import type { ChatSurface } from '../domain/chatMessage';
import { chatMessageBodyRead, chatTurnAggregateBuild } from '../domain/chatTurn';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSChatMessageCreateResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationChatMessageCreateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { chatTurnFindOne } from '../lib/chatTurnFindOne';
import { chatTurnFindOneByClientRequestId } from '../lib/chatTurnFindOneByClientRequestId';
import { chatTurnRunDetached } from '../lib/chatTurnRunDetached';

/**
 * Create a durable turn (user + pending assistant) and start the runner.
 * Idempotent on `clientRequestId`. Free-text while awaiting `promptUserForInput`
 * synthesizes an empty tool result then starts a new turn.
 */
export async function chatMessageCreate(
    { userId }: GqlSUserMutation,
    { chatId: attemptedChatId, message, fileUploadIds, clientRequestId, surface, assistantOptions }: GqlSUserMutationChatMessageCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSChatMessageCreateResult | null> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const trimmed = message.trim();
    if (!trimmed) {
        throw new Error('Chat message must not be empty');
    }

    const existing = await chatTurnFindOneByClientRequestId(serverRuntime, clientRequestId, userId);
    if (existing) {
        await serverRuntime.publish.chatTurnUpdates({
            chatId: existing.turn.chatId,
            chatTurnId: existing.turn.chatTurnId,
            revision: existing.turn.revision,
        });
        return { chatId: existing.turn.chatId, chatTurnId: existing.turn.chatTurnId };
    }

    const isNewChat = !attemptedChatId;
    const chatId = attemptedChatId ?? idCreate();
    const requestedFileUploadIds = Array.from(new Set(fileUploadIds ?? []));
    const now = new Date();

    if (requestedFileUploadIds.length > 0) {
        const owned = await serverRuntime.db
            .select({ fileUploadId: fileUploads.fileUploadId })
            .from(fileUploads)
            .where(and(eq(fileUploads.userId, userId), eq(fileUploads.fileUploadId, requestedFileUploadIds[0]!)));
        // Validate all ids
        const allOwned = await serverRuntime.db
            .select({ fileUploadId: fileUploads.fileUploadId })
            .from(fileUploads)
            .where(eq(fileUploads.userId, userId));
        const ownedSet = new Set(allOwned.map((row) => row.fileUploadId));
        for (const id of requestedFileUploadIds) {
            if (!ownedSet.has(id)) {
                throw new Error(`File upload not found or not owned: ${id}`);
            }
        }
        void owned;
    }

    let resolvedSurface: ChatSurface = surface;

    try {
        await serverRuntime.db.transaction(async (transaction) => {
            if (isNewChat) {
                const chatInsert: ChatCreate = {
                    chatId,
                    userId,
                    surface,
                    title: '',
                    lastModifiedAt: now,
                    createdAt: now,
                };
                await transaction.insert(chats).values(chatInsert);
            } else {
                const [existingChat] = await transaction
                    .select()
                    .from(chats)
                    .where(and(eq(chats.chatId, chatId), eq(chats.userId, userId), isNull(chats.deletedAt)))
                    .limit(1);
                if (!existingChat) {
                    throw new Error(`Chat not found: ${chatId}`);
                }
                if (!existingChat.surface) {
                    throw new Error(`Chat ${chatId} has no surface`);
                }
                resolvedSurface = existingChat.surface;

                // Free-text pivot: close open promptUserForInput on the active turn.
                const [activeTurn] = await transaction
                    .select()
                    .from(chatTurns)
                    .where(and(eq(chatTurns.chatId, chatId), eq(chatTurns.status, 'awaitingInput')))
                    .limit(1);
                if (activeTurn) {
                    const [assistantRow] = await transaction
                        .select()
                        .from(chatMessages)
                        .where(and(eq(chatMessages.chatTurnId, activeTurn.chatTurnId), eq(chatMessages.role, 'assistant')))
                        .limit(1);
                    if (assistantRow) {
                        const body = chatMessageBodyRead(assistantRow);
                        const nextParts = body.parts.map((part) => {
                            if (part.type !== 'tool' || part.toolName !== 'promptUserForInput') return part;
                            if (part.state !== 'inputAvailable') return part;
                            return {
                                ...part,
                                state: 'outputAvailable' as const,
                                output: { skipped: true, answers: [] },
                            };
                        });
                        await transaction
                            .update(chatMessages)
                            .set({
                                body: { ...body, parts: nextParts },
                                status: 'complete',
                                lastModifiedAt: now,
                            })
                            .where(eq(chatMessages.chatMessageId, assistantRow.chatMessageId));
                        await transaction
                            .update(chatTurns)
                            .set({
                                status: 'complete',
                                completedAt: now,
                                lastModifiedAt: now,
                                finishReason: 'pivot',
                            })
                            .where(eq(chatTurns.chatTurnId, activeTurn.chatTurnId));
                    }
                }
            }

            const aggregate = chatTurnAggregateBuild({
                chatId,
                clientRequestId,
                message: trimmed,
            });

            await transaction.insert(chatTurns).values(aggregate.turn);
            await transaction.insert(chatMessages).values([aggregate.userMessage, aggregate.assistantMessage]);

            if (requestedFileUploadIds.length > 0) {
                const attachmentRows: ChatMessageUserAttachmentCreate[] = requestedFileUploadIds.map((fileUploadId, position) => ({
                    chatMessageId: aggregate.userMessage.chatMessageId,
                    fileUploadId,
                    position,
                }));
                await transaction.insert(chatMessageUserAttachments).values(attachmentRows);
            }

            await transaction.update(chats).set({ lastModifiedAt: now }).where(eq(chats.chatId, chatId));
        });
    } catch (error) {
        const raced = await chatTurnFindOneByClientRequestId(serverRuntime, clientRequestId, userId);
        if (raced) {
            await serverRuntime.publish.chatTurnUpdates({
                chatId: raced.turn.chatId,
                chatTurnId: raced.turn.chatTurnId,
                revision: raced.turn.revision,
            });
            return { chatId: raced.turn.chatId, chatTurnId: raced.turn.chatTurnId };
        }
        throw error;
    }

    const [createdTurn] = await serverRuntime.db
        .select({ chatTurnId: chatTurns.chatTurnId })
        .from(chatTurns)
        .where(eq(chatTurns.clientRequestId, clientRequestId))
        .limit(1);
    if (!createdTurn) {
        throw new Error('Chat turn create failed');
    }

    const aggregate = await chatTurnFindOne(serverRuntime, createdTurn.chatTurnId);
    await serverRuntime.publish.chatTurnUpdates({
        chatId: aggregate.turn.chatId,
        chatTurnId: aggregate.turn.chatTurnId,
        revision: aggregate.turn.revision,
    });

    chatTurnRunDetached({
        chatTurnId: aggregate.turn.chatTurnId,
        surface: resolvedSurface,
        assistantOptions,
        requestingSession,
        serverRuntime,
    });

    return { chatId: aggregate.turn.chatId, chatTurnId: aggregate.turn.chatTurnId };
}
