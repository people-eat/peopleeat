import { and, eq } from 'drizzle-orm';

import { authPasskeys, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationUserPasskeyDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminUserPasskeyDelete(
    { adminId }: GqlSAdminMutation,
    { userId, authPasskeyId }: GqlSAdminMutationUserPasskeyDeleteArgs,
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
            throw new Error('adminUserPasskeyDelete: user not found');
        }
        if (target.status === 'ANONYMIZED') {
            throw new Error('adminUserPasskeyDelete: user is anonymized');
        }

        const deleted = await serverRuntime.db
            .delete(authPasskeys)
            .where(and(eq(authPasskeys.authPasskeyId, authPasskeyId), eq(authPasskeys.userId, userId)))
            .returning({ authPasskeyId: authPasskeys.authPasskeyId });
        if (deleted.length === 0) {
            throw new Error('adminUserPasskeyDelete: passkey not found');
        }

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: authPasskeyId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
