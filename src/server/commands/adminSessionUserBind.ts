import { eq } from 'drizzle-orm';

import { sessions, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationSessionUserBindArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { sessionUserBind } from './sessionUserBind';

/**
 * Admin impersonation: rebind the current cookie session to a target ACTIVE user.
 * Skips TOTP. Exit is a normal sign-out / re-auth as admin.
 */
export async function adminSessionUserBind(
    { adminId }: GqlSAdminMutation,
    { userId }: GqlSAdminMutationSessionUserBindArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        if (userId === adminId) {
            throw new Error('adminSessionUserBind: cannot bind to the current admin');
        }

        const [target] = await serverRuntime.db
            .select({ userId: users.userId, status: users.status })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);

        if (!target) {
            throw new Error('adminSessionUserBind: user not found');
        }
        if (target.status !== 'ACTIVE') {
            throw new Error('adminSessionUserBind: user is not ACTIVE');
        }

        await serverRuntime.db
            .update(sessions)
            .set({ pendingTotpUserId: null, pendingTotpExpiresAt: null })
            .where(eq(sessions.sessionId, requestingSession.sessionId));

        await sessionUserBind(requestingSession.sessionId, userId, requestingSession, serverRuntime);
        await serverRuntime.publish.adminUpdates();

        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
