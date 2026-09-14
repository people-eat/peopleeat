import { and, eq, isNull } from 'drizzle-orm';

import { legalBodyDeNormalize } from '../../shared/legalBodyDeNormalize';
import { adminLegalImprints } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationLegalImprintDraftUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminLegalImprintDraftUpdate(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationLegalImprintDraftUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const bodyDe = legalBodyDeNormalize(input.bodyDe);
        const changeSummaryDe = input.changeSummaryDe.trim();
        if (bodyDe.length === 0) {
            throw new Error('adminLegalImprintDraftUpdate: bodyDe must not be empty');
        }

        const now = new Date();
        const [draft] = await serverRuntime.db
            .select({ imprintId: adminLegalImprints.imprintId })
            .from(adminLegalImprints)
            .where(isNull(adminLegalImprints.publishedAt))
            .limit(1);
        if (!draft) {
            throw new Error('adminLegalImprintDraftUpdate: draft not found');
        }

        await serverRuntime.db
            .update(adminLegalImprints)
            .set({ bodyDe, changeSummaryDe, updatedAt: now })
            .where(and(eq(adminLegalImprints.imprintId, draft.imprintId), isNull(adminLegalImprints.publishedAt)));

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: draft.imprintId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
