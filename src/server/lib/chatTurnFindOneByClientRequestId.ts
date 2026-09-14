import { and, eq } from 'drizzle-orm';

import { chatMessages, chats, chatTurns } from '../db/schema';
import type { ChatTurnAggregate } from '../domain/chatTurn';
import type { ServerRuntime } from '../domain/ServerRuntime';

export async function chatTurnFindOneByClientRequestId(
    serverRuntime: ServerRuntime,
    clientRequestId: string,
    userId: string,
): Promise<ChatTurnAggregate | null> {
    const rows = await serverRuntime.db
        .select({ turn: chatTurns, message: chatMessages, chatUserId: chats.userId })
        .from(chatTurns)
        .innerJoin(chats, eq(chats.chatId, chatTurns.chatId))
        .innerJoin(chatMessages, eq(chatMessages.chatTurnId, chatTurns.chatTurnId))
        .where(and(eq(chatTurns.clientRequestId, clientRequestId), eq(chats.userId, userId)));

    const turn = rows[0]?.turn;
    if (!turn) return null;
    const userMessage = rows.find(({ message }) => message.role === 'user')?.message;
    const assistantMessage = rows.find(({ message }) => message.role === 'assistant')?.message;
    if (!userMessage || !assistantMessage) return null;
    return { turn, userMessage, assistantMessage };
}
