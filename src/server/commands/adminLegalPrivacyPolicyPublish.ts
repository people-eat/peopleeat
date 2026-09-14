import { and, eq, isNull } from 'drizzle-orm';

import { adminLegalPrivacyPolicies } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationLegalPrivacyPolicyPublishArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminLegalPrivacyPolicyPublish(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationLegalPrivacyPolicyPublishArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [draft] = await serverRuntime.db
            .select({
                privacyPolicyId: adminLegalPrivacyPolicies.privacyPolicyId,
                bodyDe: adminLegalPrivacyPolicies.bodyDe,
                changeSummaryDe: adminLegalPrivacyPolicies.changeSummaryDe,
            })
            .from(adminLegalPrivacyPolicies)
            .where(and(eq(adminLegalPrivacyPolicies.privacyPolicyId, args.privacyPolicyId), isNull(adminLegalPrivacyPolicies.publishedAt)))
            .limit(1);
        if (!draft) {
            throw new Error('adminLegalPrivacyPolicyPublish: draft not found');
        }
        if (draft.bodyDe.trim().length === 0) {
            throw new Error('adminLegalPrivacyPolicyPublish: bodyDe must not be empty');
        }
        if (draft.changeSummaryDe.trim().length === 0) {
            throw new Error('adminLegalPrivacyPolicyPublish: changeSummaryDe must not be empty');
        }

        const now = new Date();
        await serverRuntime.db
            .update(adminLegalPrivacyPolicies)
            .set({ publishedAt: now, updatedAt: now })
            .where(and(eq(adminLegalPrivacyPolicies.privacyPolicyId, args.privacyPolicyId), isNull(adminLegalPrivacyPolicies.publishedAt)));

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: args.privacyPolicyId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
