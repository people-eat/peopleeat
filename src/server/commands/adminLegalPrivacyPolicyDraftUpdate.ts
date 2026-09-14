import { and, eq, isNull } from 'drizzle-orm';

import { legalBodyDeNormalize } from '../../shared/legalBodyDeNormalize';
import { adminLegalPrivacyPolicies } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationLegalPrivacyPolicyDraftUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminLegalPrivacyPolicyDraftUpdate(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationLegalPrivacyPolicyDraftUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const bodyDe = legalBodyDeNormalize(input.bodyDe);
        const changeSummaryDe = input.changeSummaryDe.trim();
        if (bodyDe.length === 0) {
            throw new Error('adminLegalPrivacyPolicyDraftUpdate: bodyDe must not be empty');
        }

        const now = new Date();
        const [draft] = await serverRuntime.db
            .select({ privacyPolicyId: adminLegalPrivacyPolicies.privacyPolicyId })
            .from(adminLegalPrivacyPolicies)
            .where(isNull(adminLegalPrivacyPolicies.publishedAt))
            .limit(1);
        if (!draft) {
            throw new Error('adminLegalPrivacyPolicyDraftUpdate: draft not found');
        }

        await serverRuntime.db
            .update(adminLegalPrivacyPolicies)
            .set({ bodyDe, changeSummaryDe, updatedAt: now })
            .where(
                and(eq(adminLegalPrivacyPolicies.privacyPolicyId, draft.privacyPolicyId), isNull(adminLegalPrivacyPolicies.publishedAt)),
            );

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: draft.privacyPolicyId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
