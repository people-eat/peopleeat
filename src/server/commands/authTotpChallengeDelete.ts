import { eq } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function authTotpChallengeDelete(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSMutationResult> {
    try {
        await serverRuntime.db
            .update(sessions)
            .set({ pendingTotpUserId: null, pendingTotpExpiresAt: null })
            .where(eq(sessions.sessionId, requestingSession.sessionId));
        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
        return { success: true, referenceId: requestingSession.sessionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
