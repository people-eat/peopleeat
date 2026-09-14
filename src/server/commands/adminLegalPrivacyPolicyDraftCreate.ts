import { isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { legalBodyDeNormalize } from '../../shared/legalBodyDeNormalize';
import { adminLegalPrivacyPolicies } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { legalPrivacyPolicyPublishedFindLatest } from '../utils/legalPrivacyPolicyPublishedFindLatest';

export async function adminLegalPrivacyPolicyDraftCreate(
    { adminId }: GqlSAdminMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [existingDraft] = await serverRuntime.db
            .select({ privacyPolicyId: adminLegalPrivacyPolicies.privacyPolicyId })
            .from(adminLegalPrivacyPolicies)
            .where(isNull(adminLegalPrivacyPolicies.publishedAt))
            .limit(1);
        if (existingDraft) {
            throw new Error('adminLegalPrivacyPolicyDraftCreate: draft already exists');
        }

        const latestPublished = await legalPrivacyPolicyPublishedFindLatest(serverRuntime);
        const privacyPolicyId = idCreate();
        const now = new Date();
        await serverRuntime.db.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId,
            bodyDe: legalBodyDeNormalize(latestPublished?.bodyDe ?? ''),
            changeSummaryDe: '',
            createdAt: now,
            updatedAt: now,
            publishedAt: null,
        });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: privacyPolicyId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
