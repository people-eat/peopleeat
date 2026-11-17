import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { userAccountDeletionScheduleClear } from '../utils/userAccountDeletionSchedule';

/**
 * Cancels a pending scheduled account deletion for the signed-in user.
 * See docs/features/account.md.
 */
export async function userAccountDeletionCancel(
    { userId }: GqlSUserMutation,
    _args: Record<string, never>,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, requestingSession, serverRuntime);

    try {
        const [currentUser] = await serverRuntime.db
            .select({ status: users.status, accountDeletionScheduledFor: users.accountDeletionScheduledFor })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!currentUser) {
            throw new Error('userAccountDeletionCancel: user not found');
        }
        if (currentUser.status === 'ANONYMIZED') {
            throw new Error('userAccountDeletionCancel: already anonymized');
        }
        if (currentUser.accountDeletionScheduledFor == null) {
            return { success: true, referenceId: userId };
        }

        await userAccountDeletionScheduleClear(userId, serverRuntime);
        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
