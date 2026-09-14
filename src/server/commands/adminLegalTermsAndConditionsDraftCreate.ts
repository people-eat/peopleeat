import { isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { legalBodyDeNormalize } from '../../shared/legalBodyDeNormalize';
import { adminLegalTermsAndConditions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { legalTermsAndConditionsPublishedFindLatest } from '../utils/legalTermsAndConditionsPublishedFindLatest';

export async function adminLegalTermsAndConditionsDraftCreate(
    { adminId }: GqlSAdminMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [existingDraft] = await serverRuntime.db
            .select({ termsAndConditionsId: adminLegalTermsAndConditions.termsAndConditionsId })
            .from(adminLegalTermsAndConditions)
            .where(isNull(adminLegalTermsAndConditions.publishedAt))
            .limit(1);
        if (existingDraft) {
            throw new Error('adminLegalTermsAndConditionsDraftCreate: draft already exists');
        }

        const latestPublished = await legalTermsAndConditionsPublishedFindLatest(serverRuntime);
        const termsAndConditionsId = idCreate();
        const now = new Date();
        await serverRuntime.db.insert(adminLegalTermsAndConditions).values({
            termsAndConditionsId,
            bodyDe: legalBodyDeNormalize(latestPublished?.bodyDe ?? ''),
            changeSummaryDe: '',
            createdAt: now,
            updatedAt: now,
            publishedAt: null,
        });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: termsAndConditionsId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
