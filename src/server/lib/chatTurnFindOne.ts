import { eq } from 'drizzle-orm';

import { chatMessages, chatTurns } from '../db/schema';
import type { ChatTurnAggregate } from '../domain/chatTurn';
import type { ServerRuntime } from '../domain/ServerRuntime';

export async function chatTurnFindOne(serverRuntime: ServerRuntime, chatTurnId: string): Promise<ChatTurnAggregate> {
    const rows = await serverRuntime.db
        .select({ turn: chatTurns, message: chatMessages })
        .from(chatTurns)
        .innerJoin(chatMessages, eq(chatMessages.chatTurnId, chatTurns.chatTurnId))
        .where(eq(chatTurns.chatTurnId, chatTurnId));
    const turn = rows[0]?.turn;
    const userMessage = rows.find(({ message }) => message.role === 'user')?.message;
    const assistantMessage = rows.find(({ message }) => message.role === 'assistant')?.message;

    if (!turn || !userMessage || !assistantMessage) {
        throw new Error(`Chat turn not found: ${chatTurnId}`);
    }
    return { turn, userMessage, assistantMessage };
}
