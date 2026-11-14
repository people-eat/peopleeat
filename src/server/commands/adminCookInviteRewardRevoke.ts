import { and, eq } from 'drizzle-orm';

import { cookInviteRewards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookInviteRewardRevokeArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminCookInviteRewardRevoke(
    { adminId }: GqlSAdminMutation,
    { cookInviteRewardId }: GqlSAdminMutationCookInviteRewardRevokeArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const [updated] = await serverRuntime.db
            .update(cookInviteRewards)
            .set({ status: 'REVOKED', lastModifiedAt: new Date() })
            .where(and(eq(cookInviteRewards.cookInviteRewardId, cookInviteRewardId), eq(cookInviteRewards.status, 'OPEN')))
            .returning({ cookInviteRewardId: cookInviteRewards.cookInviteRewardId, cookId: cookInviteRewards.cookId });

        if (!updated) {
            throw new Error('adminCookInviteRewardRevoke: open reward not found');
        }

        await Promise.all([serverRuntime.publish.userUpdates({ userId: updated.cookId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: updated.cookInviteRewardId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
