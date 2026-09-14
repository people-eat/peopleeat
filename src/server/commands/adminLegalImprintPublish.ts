import { and, eq, isNull } from 'drizzle-orm';

import { adminLegalImprints } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationLegalImprintPublishArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminLegalImprintPublish(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationLegalImprintPublishArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [draft] = await serverRuntime.db
            .select({
                imprintId: adminLegalImprints.imprintId,
                bodyDe: adminLegalImprints.bodyDe,
                changeSummaryDe: adminLegalImprints.changeSummaryDe,
            })
            .from(adminLegalImprints)
            .where(and(eq(adminLegalImprints.imprintId, args.imprintId), isNull(adminLegalImprints.publishedAt)))
            .limit(1);
        if (!draft) {
            throw new Error('adminLegalImprintPublish: draft not found');
        }
        if (draft.bodyDe.trim().length === 0) {
            throw new Error('adminLegalImprintPublish: bodyDe must not be empty');
        }
        if (draft.changeSummaryDe.trim().length === 0) {
            throw new Error('adminLegalImprintPublish: changeSummaryDe must not be empty');
        }

        const now = new Date();
        await serverRuntime.db
            .update(adminLegalImprints)
            .set({ publishedAt: now, updatedAt: now })
            .where(and(eq(adminLegalImprints.imprintId, args.imprintId), isNull(adminLegalImprints.publishedAt)));

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: args.imprintId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
