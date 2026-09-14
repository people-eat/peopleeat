import { and, eq, isNull } from 'drizzle-orm';

import { adminLegalTermsAndConditions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationLegalTermsAndConditionsPublishArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminLegalTermsAndConditionsPublish(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationLegalTermsAndConditionsPublishArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [draft] = await serverRuntime.db
            .select({
                termsAndConditionsId: adminLegalTermsAndConditions.termsAndConditionsId,
                bodyDe: adminLegalTermsAndConditions.bodyDe,
                changeSummaryDe: adminLegalTermsAndConditions.changeSummaryDe,
            })
            .from(adminLegalTermsAndConditions)
            .where(
                and(
                    eq(adminLegalTermsAndConditions.termsAndConditionsId, args.termsAndConditionsId),
                    isNull(adminLegalTermsAndConditions.publishedAt),
                ),
            )
            .limit(1);
        if (!draft) {
            throw new Error('adminLegalTermsAndConditionsPublish: draft not found');
        }
        if (draft.bodyDe.trim().length === 0) {
            throw new Error('adminLegalTermsAndConditionsPublish: bodyDe must not be empty');
        }
        if (draft.changeSummaryDe.trim().length === 0) {
            throw new Error('adminLegalTermsAndConditionsPublish: changeSummaryDe must not be empty');
        }

        const now = new Date();
        await serverRuntime.db
            .update(adminLegalTermsAndConditions)
            .set({ publishedAt: now, updatedAt: now })
            .where(
                and(
                    eq(adminLegalTermsAndConditions.termsAndConditionsId, args.termsAndConditionsId),
                    isNull(adminLegalTermsAndConditions.publishedAt),
                ),
            );

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: args.termsAndConditionsId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
