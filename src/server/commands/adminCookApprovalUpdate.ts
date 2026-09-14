import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookApprovalUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { adminCookApprovalUpdateEmailSend } from '../utils/cookLifecycleEmails';

export async function adminCookApprovalUpdate(
    { adminId }: GqlSAdminMutation,
    { cookId, isApprovedByAdmin }: GqlSAdminMutationCookApprovalUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [existing] = await serverRuntime.db
            .select({ isApprovedByAdmin: cooks.isApprovedByAdmin })
            .from(cooks)
            .where(eq(cooks.cookId, cookId))
            .limit(1);

        if (!existing) {
            throw new Error('adminCookApprovalUpdate: cook not found');
        }

        const wasApproved = existing.isApprovedByAdmin;

        const [updated] = await serverRuntime.db
            .update(cooks)
            .set({ isApprovedByAdmin, lastModifiedAt: new Date() })
            .where(eq(cooks.cookId, cookId))
            .returning({ cookId: cooks.cookId });

        if (!updated) {
            throw new Error('adminCookApprovalUpdate: cook not found');
        }

        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);

        if (!wasApproved && isApprovedByAdmin) {
            await adminCookApprovalUpdateEmailSend(serverRuntime, { cookId });
        }

        return { success: true, referenceId: cookId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
