import { eq, sum } from 'drizzle-orm';

import { supportRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUser, GqlSUserAttentionCounts } from '../graphql/generated';

export async function userAttentionCountsFindOne(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserAttentionCounts | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    try {
        const [row] = await serverRuntime.db
            .select({ value: sum(supportRequests.userUnreadNotificationCount) })
            .from(supportRequests)
            .where(eq(supportRequests.userId, parentUser.userId));

        return { supportRequestUnreadCount: Number(row?.value ?? 0) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
