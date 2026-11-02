import { and, eq, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { legalBodyDeNormalize } from '../../shared/legalBodyDeNormalize';
import { adminLegalImprints, adminLegalPrivacyPolicies, adminLegalTermsAndConditions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationLegalDocumentDraftUpsertArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { legalImprintPublishedFindLatest } from '../utils/legalImprintPublishedFindLatest';
import { legalPrivacyPolicyPublishedFindLatest } from '../utils/legalPrivacyPolicyPublishedFindLatest';
import { legalTermsAndConditionsPublishedFindLatest } from '../utils/legalTermsAndConditionsPublishedFindLatest';

export async function adminLegalDocumentDraftUpsert(
    { adminId }: GqlSAdminMutation,
    { kind, input }: GqlSAdminMutationLegalDocumentDraftUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const normalizedBody = legalBodyDeNormalize(input.bodyDe);
        const changeSummaryDe = input.changeSummaryDe.trim();
        const now = new Date();

        switch (kind) {
            case 'PRIVACY_POLICY': {
                const [draft] = await serverRuntime.db
                    .select({ privacyPolicyId: adminLegalPrivacyPolicies.privacyPolicyId })
                    .from(adminLegalPrivacyPolicies)
                    .where(isNull(adminLegalPrivacyPolicies.publishedAt))
                    .limit(1);

                if (draft) {
                    if (normalizedBody.length === 0) {
                        throw new Error('adminLegalDocumentDraftUpsert: bodyDe must not be empty');
                    }
                    await serverRuntime.db
                        .update(adminLegalPrivacyPolicies)
                        .set({ bodyDe: normalizedBody, changeSummaryDe, updatedAt: now })
                        .where(
                            and(
                                eq(adminLegalPrivacyPolicies.privacyPolicyId, draft.privacyPolicyId),
                                isNull(adminLegalPrivacyPolicies.publishedAt),
                            ),
                        );
                    await serverRuntime.publish.adminUpdates();
                    return { success: true, referenceId: draft.privacyPolicyId };
                }

                const latestPublished = await legalPrivacyPolicyPublishedFindLatest(serverRuntime);
                const bodyDe = normalizedBody.length > 0 ? normalizedBody : legalBodyDeNormalize(latestPublished?.bodyDe ?? '');
                const privacyPolicyId = idCreate();
                await serverRuntime.db.insert(adminLegalPrivacyPolicies).values({
                    privacyPolicyId,
                    bodyDe,
                    changeSummaryDe,
                    createdAt: now,
                    updatedAt: now,
                    publishedAt: null,
                });
                await serverRuntime.publish.adminUpdates();
                return { success: true, referenceId: privacyPolicyId };
            }
            case 'TERMS_AND_CONDITIONS': {
                const [draft] = await serverRuntime.db
                    .select({ termsAndConditionsId: adminLegalTermsAndConditions.termsAndConditionsId })
                    .from(adminLegalTermsAndConditions)
                    .where(isNull(adminLegalTermsAndConditions.publishedAt))
                    .limit(1);

                if (draft) {
                    if (normalizedBody.length === 0) {
                        throw new Error('adminLegalDocumentDraftUpsert: bodyDe must not be empty');
                    }
                    await serverRuntime.db
                        .update(adminLegalTermsAndConditions)
                        .set({ bodyDe: normalizedBody, changeSummaryDe, updatedAt: now })
                        .where(
                            and(
                                eq(adminLegalTermsAndConditions.termsAndConditionsId, draft.termsAndConditionsId),
                                isNull(adminLegalTermsAndConditions.publishedAt),
                            ),
                        );
                    await serverRuntime.publish.adminUpdates();
                    return { success: true, referenceId: draft.termsAndConditionsId };
                }

                const latestPublished = await legalTermsAndConditionsPublishedFindLatest(serverRuntime);
                const bodyDe = normalizedBody.length > 0 ? normalizedBody : legalBodyDeNormalize(latestPublished?.bodyDe ?? '');
                const termsAndConditionsId = idCreate();
                await serverRuntime.db.insert(adminLegalTermsAndConditions).values({
                    termsAndConditionsId,
                    bodyDe,
                    changeSummaryDe,
                    createdAt: now,
                    updatedAt: now,
                    publishedAt: null,
                });
                await serverRuntime.publish.adminUpdates();
                return { success: true, referenceId: termsAndConditionsId };
            }
            case 'IMPRINT': {
                const [draft] = await serverRuntime.db
                    .select({ imprintId: adminLegalImprints.imprintId })
                    .from(adminLegalImprints)
                    .where(isNull(adminLegalImprints.publishedAt))
                    .limit(1);

                if (draft) {
                    if (normalizedBody.length === 0) {
                        throw new Error('adminLegalDocumentDraftUpsert: bodyDe must not be empty');
                    }
                    await serverRuntime.db
                        .update(adminLegalImprints)
                        .set({ bodyDe: normalizedBody, changeSummaryDe, updatedAt: now })
                        .where(and(eq(adminLegalImprints.imprintId, draft.imprintId), isNull(adminLegalImprints.publishedAt)));
                    await serverRuntime.publish.adminUpdates();
                    return { success: true, referenceId: draft.imprintId };
                }

                const latestPublished = await legalImprintPublishedFindLatest(serverRuntime);
                const bodyDe = normalizedBody.length > 0 ? normalizedBody : legalBodyDeNormalize(latestPublished?.bodyDe ?? '');
                const imprintId = idCreate();
                await serverRuntime.db.insert(adminLegalImprints).values({
                    imprintId,
                    bodyDe,
                    changeSummaryDe,
                    createdAt: now,
                    updatedAt: now,
                    publishedAt: null,
                });
                await serverRuntime.publish.adminUpdates();
                return { success: true, referenceId: imprintId };
            }
            default: {
                throw new Error(`adminLegalDocumentDraftUpsert: unsupported kind ${kind satisfies never}`);
            }
        }
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
