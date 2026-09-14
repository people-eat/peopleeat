import { and, eq, sql } from 'drizzle-orm';

import { chatMessages, chats, chatTurns } from '../db/schema';
import type { ChatSurface } from '../domain/chatMessage';
import type { ChatMessageBody } from '../domain/chatMessageBody';
import { chatMessageBodyRead } from '../domain/chatTurn';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSChatMessageCreateResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationChatInputCollectionRespondArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { chatTurnFindOne } from '../lib/chatTurnFindOne';
import { chatTurnFindOneByClientRequestId } from '../lib/chatTurnFindOneByClientRequestId';
import { chatTurnRunDetached } from '../lib/chatTurnRunDetached';

/**
 * Write `promptUserForInput` tool result onto the awaiting part and resume.
 */
export async function chatInputCollectionRespond(
    { userId }: GqlSUserMutation,
    { chatTurnId, toolCallId, answers, clientRequestId, assistantOptions }: GqlSUserMutationChatInputCollectionRespondArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSChatMessageCreateResult | null> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const existing = await chatTurnFindOneByClientRequestId(serverRuntime, clientRequestId, userId);
    if (existing) {
        await serverRuntime.publish.chatTurnUpdates({
            chatId: existing.turn.chatId,
            chatTurnId: existing.turn.chatTurnId,
            revision: existing.turn.revision,
        });
        return { chatId: existing.turn.chatId, chatTurnId: existing.turn.chatTurnId };
    }

    const now = new Date();
    let surface: ChatSurface = 'customer';

    await serverRuntime.db.transaction(async (transaction) => {
        const [row] = await transaction
            .select({ turn: chatTurns, chat: chats, message: chatMessages })
            .from(chatTurns)
            .innerJoin(chats, eq(chats.chatId, chatTurns.chatId))
            .innerJoin(chatMessages, and(eq(chatMessages.chatTurnId, chatTurns.chatTurnId), eq(chatMessages.role, 'assistant')))
            .where(and(eq(chatTurns.chatTurnId, chatTurnId), eq(chats.userId, userId), eq(chatTurns.status, 'awaitingInput')))
            .limit(1);
        if (!row) {
            throw new Error(`No awaiting turn for input respond: ${chatTurnId}`);
        }
        if (!row.chat.surface) {
            throw new Error(`Chat ${row.chat.chatId} has no surface`);
        }
        surface = row.chat.surface;

        const body = chatMessageBodyRead(row.message);
        const toolPartIndex = body.parts.findIndex(
            (part) => part.type === 'tool' && part.toolCallId === toolCallId && part.toolName === 'promptUserForInput',
        );
        if (toolPartIndex < 0) {
            throw new Error(`promptUserForInput tool call not found: ${toolCallId}`);
        }
        const nextParts = body.parts.map((part, index) => {
            if (index !== toolPartIndex || part.type !== 'tool') return part;
            return {
                ...part,
                state: 'outputAvailable' as const,
                output: answers,
            };
        });

        const nextBody: ChatMessageBody = { ...body, parts: nextParts };
        await transaction
            .update(chatMessages)
            .set({
                body: nextBody,
                status: 'streaming',
                lastModifiedAt: now,
                revision: sql`${chatMessages.revision} + 1`,
            })
            .where(eq(chatMessages.chatMessageId, row.message.chatMessageId));
        await transaction
            .update(chatTurns)
            .set({
                status: 'queued',
                clientRequestId,
                lastModifiedAt: now,
                revision: sql`${chatTurns.revision} + 1`,
            })
            .where(eq(chatTurns.chatTurnId, chatTurnId));
        await transaction.update(chats).set({ lastModifiedAt: now }).where(eq(chats.chatId, row.chat.chatId));
    });

    const aggregate = await chatTurnFindOne(serverRuntime, chatTurnId);
    await serverRuntime.publish.chatTurnUpdates({
        chatId: aggregate.turn.chatId,
        chatTurnId: aggregate.turn.chatTurnId,
        revision: aggregate.turn.revision,
    });

    chatTurnRunDetached({
        chatTurnId,
        surface,
        assistantOptions,
        requestingSession,
        serverRuntime,
    });

    return { chatId: aggregate.turn.chatId, chatTurnId };
}
