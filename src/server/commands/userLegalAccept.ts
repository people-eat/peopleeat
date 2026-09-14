import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation } from '../graphql/generated';
import { sessionEventCreate } from '../utils/sessionEventCreate';

export async function userLegalAccept(
    { userId }: GqlSUserMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const now = new Date();
        const updated = await serverRuntime.db
            .update(users)
            .set({
                lastAcceptedPrivacyPolicy: now,
                lastAcceptedTerms: now,
            })
            .where(eq(users.userId, userId))
            .returning({ userId: users.userId });

        if (updated.length === 0) {
            throw new Error('userLegalAccept: user not found');
        }

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'USER_TERMS_ACCEPTED',
            payload: {},
        });
        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'USER_PRIVACY_POLICY_ACCEPTED',
            payload: {},
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
