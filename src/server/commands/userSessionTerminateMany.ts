import { and, eq, inArray } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationTerminateSessionsArgs } from '../graphql/generated';

export async function userSessionTerminateMany(
    { userId }: GqlSUserMutation,
    { sessionIds }: GqlSUserMutationTerminateSessionsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await serverRuntime.db
            .update(sessions)
            .set({
                wasTerminatedAt: new Date(),
            })
            .where(and(eq(sessions.userId, userId), inArray(sessions.sessionId, sessionIds)));

        await serverRuntime.publish.userUpdates({ userId });

        return {
            success: true,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
