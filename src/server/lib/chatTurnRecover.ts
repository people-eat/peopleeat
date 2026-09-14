import { and, eq, inArray, sql } from 'drizzle-orm';

import { chatMessages, chatTurns } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/** Mark orphaned queued/running turns failed after process restart (no provider resume). */
export async function chatTurnRecover(serverRuntime: ServerRuntime): Promise<void> {
    const now = new Date();
    try {
        await serverRuntime.db.transaction(async (transaction) => {
            const interrupted = await transaction
                .update(chatTurns)
                .set({
                    status: 'failed',
                    failureCode: 'TURN_INTERRUPTED',
                    completedAt: now,
                    lastModifiedAt: now,
                    revision: sql`${chatTurns.revision} + 1`,
                })
                .where(inArray(chatTurns.status, ['queued', 'running']))
                .returning({ chatTurnId: chatTurns.chatTurnId });
            const turnIds = interrupted.map(({ chatTurnId }) => chatTurnId);
            if (turnIds.length > 0) {
                await transaction
                    .update(chatMessages)
                    .set({
                        status: 'failed',
                        lastModifiedAt: now,
                        revision: sql`${chatMessages.revision} + 1`,
                    })
                    .where(and(inArray(chatMessages.chatTurnId, turnIds), eq(chatMessages.role, 'assistant')));
            }
        });
    } catch (error) {
        serverRuntime.log.error(error);
    }
}
