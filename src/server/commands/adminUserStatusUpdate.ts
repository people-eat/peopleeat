import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { UserStatus } from '../domain/user';
import type { GqlSAdminMutation, GqlSAdminMutationUserStatusUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { userDualAcceptedEventCoolOffAssert } from '../utils/userDualAcceptedEventCoolOff';
import { USER_MARKETPLACE_CLEANUP_REASON_BAN, userMarketplaceOpenCleanup } from '../utils/userMarketplaceOpenCleanup';

/**
 * Admin ban / unban (`ACTIVE` ↔ `BANNED`). Ban is cool-off gated and runs
 * marketplace cleanup. Sessions stay bound so the profile restriction banner
 * can appear live via `userUpdates`. See docs/features/admin-users.md.
 */
export async function adminUserStatusUpdate(
    { adminId }: GqlSAdminMutation,
    { userId, status }: GqlSAdminMutationUserStatusUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    if (status !== 'ACTIVE' && status !== 'BANNED') {
        throw new Error('adminUserStatusUpdate: status must be ACTIVE or BANNED');
    }

    try {
        const [target] = await serverRuntime.db
            .select({ userId: users.userId, status: users.status })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!target) {
            throw new Error('adminUserStatusUpdate: user not found');
        }
        if (target.status === 'ANONYMIZED') {
            throw new Error('adminUserStatusUpdate: user is anonymized');
        }

        const nextStatus: UserStatus = status;
        if (target.status === nextStatus) {
            return { success: true, referenceId: userId };
        }

        if (nextStatus === 'BANNED') {
            await userDualAcceptedEventCoolOffAssert(userId, serverRuntime, 'adminUserStatusUpdate');
            const cleanup = await userMarketplaceOpenCleanup(userId, USER_MARKETPLACE_CLEANUP_REASON_BAN, serverRuntime);
            await serverRuntime.db.update(users).set({ status: nextStatus }).where(eq(users.userId, userId));

            const publishJobs: Array<Promise<unknown>> = [
                serverRuntime.publish.userUpdates({ userId }),
                serverRuntime.publish.adminUpdates(),
            ];
            for (const counterpartId of cleanup.affectedCounterpartUserIds) {
                publishJobs.push(serverRuntime.publish.userUpdates({ userId: counterpartId }));
            }
            await Promise.all(publishJobs);
            return { success: true, referenceId: userId };
        }

        await serverRuntime.db.update(users).set({ status: nextStatus }).where(eq(users.userId, userId));
        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
