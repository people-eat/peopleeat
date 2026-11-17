import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationUserAccountDeletionCancelArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { userAccountDeletionScheduleClear } from '../utils/userAccountDeletionSchedule';

/**
 * Admin cancel of a pending scheduled account deletion.
 * See docs/features/account.md.
 */
export async function adminUserAccountDeletionCancel(
    { adminId }: GqlSAdminMutation,
    { userId }: GqlSAdminMutationUserAccountDeletionCancelArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const [target] = await serverRuntime.db
            .select({ status: users.status, accountDeletionScheduledFor: users.accountDeletionScheduledFor })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!target) {
            throw new Error('adminUserAccountDeletionCancel: user not found');
        }
        if (target.status === 'ANONYMIZED') {
            throw new Error('adminUserAccountDeletionCancel: already anonymized');
        }
        if (target.accountDeletionScheduledFor == null) {
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
