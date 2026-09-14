import { and, eq } from 'drizzle-orm';

import type { ChatMessage, ChatTurn } from '../db/schema';
import { chatMessages, chats, chatTurns } from '../db/schema';
import type { ChatTurnAggregate } from '../domain/chatTurn';
import type { ServerRuntime } from '../domain/ServerRuntime';

type ChatTurnAggregateDraft = {
    turn: ChatTurn;
    userMessage?: ChatMessage;
    assistantMessage?: ChatMessage;
};

function chatTurnAggregateComplete(aggregate: ChatTurnAggregateDraft): aggregate is ChatTurnAggregate {
    return aggregate.userMessage != null && aggregate.assistantMessage != null;
}

function chatTurnAggregatesFromRows(rows: Array<{ turn: ChatTurn; message: ChatMessage | null }>): ChatTurnAggregate[] {
    const aggregates = new Map<string, ChatTurnAggregateDraft>();
    for (const { turn, message } of rows) {
        if (!message) continue;
        const existing = aggregates.get(turn.chatTurnId);
        if (existing) {
            if (message.role === 'user') existing.userMessage = message;
            else existing.assistantMessage = message;
            continue;
        }
        aggregates.set(turn.chatTurnId, {
            turn,
            userMessage: message.role === 'user' ? message : undefined,
            assistantMessage: message.role === 'assistant' ? message : undefined,
        });
    }

    return [...aggregates.values()].filter(chatTurnAggregateComplete);
}

/** Load all turn aggregates for a chat owned by `userId` (auth gate). */
export async function chatTurnAggregateFindMany(
    serverRuntime: ServerRuntime,
    chatId: string,
    userId: string,
): Promise<ChatTurnAggregate[]> {
    const rows = await serverRuntime.db
        .select({ turn: chatTurns, message: chatMessages })
        .from(chatTurns)
        .innerJoin(chats, eq(chats.chatId, chatTurns.chatId))
        .leftJoin(chatMessages, eq(chatMessages.chatTurnId, chatTurns.chatTurnId))
        .where(and(eq(chatTurns.chatId, chatId), eq(chats.userId, userId)))
        .orderBy(chatTurns.sequence, chatMessages.createdAt);

    return chatTurnAggregatesFromRows(rows);
}

/** Load turns for a chat without ownership check (admin detail). */
export async function chatTurnAggregateFindManyByChatId(serverRuntime: ServerRuntime, chatId: string): Promise<ChatTurnAggregate[]> {
    const rows = await serverRuntime.db
        .select({ turn: chatTurns, message: chatMessages })
        .from(chatTurns)
        .leftJoin(chatMessages, eq(chatMessages.chatTurnId, chatTurns.chatTurnId))
        .where(eq(chatTurns.chatId, chatId))
        .orderBy(chatTurns.sequence, chatMessages.createdAt);

    return chatTurnAggregatesFromRows(rows);
}
