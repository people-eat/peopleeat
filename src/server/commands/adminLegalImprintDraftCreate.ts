import { isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { legalBodyDeNormalize } from '../../shared/legalBodyDeNormalize';
import { adminLegalImprints } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { legalImprintPublishedFindLatest } from '../utils/legalImprintPublishedFindLatest';

export async function adminLegalImprintDraftCreate(
    { adminId }: GqlSAdminMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [existingDraft] = await serverRuntime.db
            .select({ imprintId: adminLegalImprints.imprintId })
            .from(adminLegalImprints)
            .where(isNull(adminLegalImprints.publishedAt))
            .limit(1);
        if (existingDraft) {
            throw new Error('adminLegalImprintDraftCreate: draft already exists');
        }

        const latestPublished = await legalImprintPublishedFindLatest(serverRuntime);
        const imprintId = idCreate();
        const now = new Date();
        await serverRuntime.db.insert(adminLegalImprints).values({
            imprintId,
            bodyDe: legalBodyDeNormalize(latestPublished?.bodyDe ?? ''),
            changeSummaryDe: '',
            createdAt: now,
            updatedAt: now,
            publishedAt: null,
        });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: imprintId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
