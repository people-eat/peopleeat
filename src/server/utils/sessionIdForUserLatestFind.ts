import { and, desc, eq, isNull } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/**
 * Latest non-terminated session for a user (by `lastInteractionAt`).
 * Used when lifecycle events fire outside a GraphQL requesting session
 * (Stripe webhooks, pull-payment jobs).
 */
export async function sessionIdForUserLatestFind(serverRuntime: ServerRuntime, userId: string): Promise<string | null> {
    const [row] = await serverRuntime.db
        .select({ sessionId: sessions.sessionId })
        .from(sessions)
        .where(and(eq(sessions.userId, userId), isNull(sessions.wasTerminatedAt)))
        .orderBy(desc(sessions.lastInteractionAt))
        .limit(1);
    return row?.sessionId ?? null;
}
