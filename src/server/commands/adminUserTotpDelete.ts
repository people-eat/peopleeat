import { eq } from 'drizzle-orm';

import { authTimeBasedOneTimePasswords, sessions, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationUserTotpDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminUserTotpDelete(
    { adminId }: GqlSAdminMutation,
    { userId }: GqlSAdminMutationUserTotpDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const [target] = await serverRuntime.db
            .select({ userId: users.userId, status: users.status })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!target) {
            throw new Error('adminUserTotpDelete: user not found');
        }
        if (target.status === 'ANONYMIZED') {
            throw new Error('adminUserTotpDelete: user is anonymized');
        }

        const [row] = await serverRuntime.db
            .select({
                authTimeBasedOneTimePasswordId: authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId,
            })
            .from(authTimeBasedOneTimePasswords)
            .where(eq(authTimeBasedOneTimePasswords.userId, userId))
            .limit(1);
        if (!row) {
            throw new Error('adminUserTotpDelete: authenticator not found');
        }

        const pendingSessions = await serverRuntime.db
            .select({ sessionId: sessions.sessionId })
            .from(sessions)
            .where(eq(sessions.pendingTotpUserId, userId));

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .delete(authTimeBasedOneTimePasswords)
                .where(eq(authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId, row.authTimeBasedOneTimePasswordId));
            await transaction
                .update(sessions)
                .set({ pendingTotpUserId: null, pendingTotpExpiresAt: null })
                .where(eq(sessions.pendingTotpUserId, userId));
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId }),
            ...pendingSessions.map((session) => serverRuntime.publish.sessionUpdates({ sessionId: session.sessionId })),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: row.authTimeBasedOneTimePasswordId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
