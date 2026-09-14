import { inArray } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationTerminateSessionsArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

/**
 * Admin-triggered session termination by id. Ends any sessions (not scoped to
 * the admin's own account). See docs/features/admin-sessions.md.
 */
export async function adminSessionTerminateMany(
    { adminId }: GqlSAdminMutation,
    { sessionIds }: GqlSAdminMutationTerminateSessionsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    if (sessionIds.length === 0) {
        return { success: true };
    }

    try {
        const updated = await serverRuntime.db
            .update(sessions)
            .set({
                wasTerminatedAt: new Date(),
            })
            .where(inArray(sessions.sessionId, sessionIds))
            .returning({ userId: sessions.userId });

        const userIds = [...new Set(updated.map((row) => row.userId).filter((userId): userId is string => userId != null))];

        await Promise.all([
            ...userIds.map((userId) => serverRuntime.publish.userUpdates({ userId })),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
