import { and, eq, isNull } from 'drizzle-orm';

import { legalBodyDeNormalize } from '../../shared/legalBodyDeNormalize';
import { adminLegalTermsAndConditions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationLegalTermsAndConditionsDraftUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminLegalTermsAndConditionsDraftUpdate(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationLegalTermsAndConditionsDraftUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const bodyDe = legalBodyDeNormalize(input.bodyDe);
        const changeSummaryDe = input.changeSummaryDe.trim();
        if (bodyDe.length === 0) {
            throw new Error('adminLegalTermsAndConditionsDraftUpdate: bodyDe must not be empty');
        }

        const now = new Date();
        const [draft] = await serverRuntime.db
            .select({ termsAndConditionsId: adminLegalTermsAndConditions.termsAndConditionsId })
            .from(adminLegalTermsAndConditions)
            .where(isNull(adminLegalTermsAndConditions.publishedAt))
            .limit(1);
        if (!draft) {
            throw new Error('adminLegalTermsAndConditionsDraftUpdate: draft not found');
        }

        await serverRuntime.db
            .update(adminLegalTermsAndConditions)
            .set({ bodyDe, changeSummaryDe, updatedAt: now })
            .where(
                and(
                    eq(adminLegalTermsAndConditions.termsAndConditionsId, draft.termsAndConditionsId),
                    isNull(adminLegalTermsAndConditions.publishedAt),
                ),
            );

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: draft.termsAndConditionsId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
