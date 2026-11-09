import { and, eq, isNull } from 'drizzle-orm';

import { adminLegalImprints, adminLegalPrivacyPolicies, adminLegalTermsAndConditions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationLegalDocumentPublishArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminLegalDocumentPublish(
    { adminId }: GqlSAdminMutation,
    { kind, documentId }: GqlSAdminMutationLegalDocumentPublishArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const now = new Date();

        switch (kind) {
            case 'PRIVACY_POLICY': {
                const [draft] = await serverRuntime.db
                    .select({
                        privacyPolicyId: adminLegalPrivacyPolicies.privacyPolicyId,
                        bodyDe: adminLegalPrivacyPolicies.bodyDe,
                        changeSummaryDe: adminLegalPrivacyPolicies.changeSummaryDe,
                    })
                    .from(adminLegalPrivacyPolicies)
                    .where(and(eq(adminLegalPrivacyPolicies.privacyPolicyId, documentId), isNull(adminLegalPrivacyPolicies.publishedAt)))
                    .limit(1);
                if (!draft) {
                    throw new Error('adminLegalDocumentPublish: draft not found');
                }
                if (draft.bodyDe.trim().length === 0) {
                    throw new Error('adminLegalDocumentPublish: bodyDe must not be empty');
                }
                if (draft.changeSummaryDe.trim().length === 0) {
                    throw new Error('adminLegalDocumentPublish: changeSummaryDe must not be empty');
                }
                await serverRuntime.db
                    .update(adminLegalPrivacyPolicies)
                    .set({ publishedAt: now, updatedAt: now })
                    .where(and(eq(adminLegalPrivacyPolicies.privacyPolicyId, documentId), isNull(adminLegalPrivacyPolicies.publishedAt)));
                await serverRuntime.publish.adminUpdates();
                return { success: true, referenceId: documentId };
            }
            case 'TERMS_AND_CONDITIONS': {
                const [draft] = await serverRuntime.db
                    .select({
                        termsAndConditionsId: adminLegalTermsAndConditions.termsAndConditionsId,
                        bodyDe: adminLegalTermsAndConditions.bodyDe,
                        changeSummaryDe: adminLegalTermsAndConditions.changeSummaryDe,
                    })
                    .from(adminLegalTermsAndConditions)
                    .where(
                        and(
                            eq(adminLegalTermsAndConditions.termsAndConditionsId, documentId),
                            isNull(adminLegalTermsAndConditions.publishedAt),
                        ),
                    )
                    .limit(1);
                if (!draft) {
                    throw new Error('adminLegalDocumentPublish: draft not found');
                }
                if (draft.bodyDe.trim().length === 0) {
                    throw new Error('adminLegalDocumentPublish: bodyDe must not be empty');
                }
                if (draft.changeSummaryDe.trim().length === 0) {
                    throw new Error('adminLegalDocumentPublish: changeSummaryDe must not be empty');
                }
                await serverRuntime.db
                    .update(adminLegalTermsAndConditions)
                    .set({ publishedAt: now, updatedAt: now })
                    .where(
                        and(
                            eq(adminLegalTermsAndConditions.termsAndConditionsId, documentId),
                            isNull(adminLegalTermsAndConditions.publishedAt),
                        ),
                    );
                await serverRuntime.publish.adminUpdates();
                return { success: true, referenceId: documentId };
            }
            case 'IMPRINT': {
                const [draft] = await serverRuntime.db
                    .select({
                        imprintId: adminLegalImprints.imprintId,
                        bodyDe: adminLegalImprints.bodyDe,
                        changeSummaryDe: adminLegalImprints.changeSummaryDe,
                    })
                    .from(adminLegalImprints)
                    .where(and(eq(adminLegalImprints.imprintId, documentId), isNull(adminLegalImprints.publishedAt)))
                    .limit(1);
                if (!draft) {
                    throw new Error('adminLegalDocumentPublish: draft not found');
                }
                if (draft.bodyDe.trim().length === 0) {
                    throw new Error('adminLegalDocumentPublish: bodyDe must not be empty');
                }
                if (draft.changeSummaryDe.trim().length === 0) {
                    throw new Error('adminLegalDocumentPublish: changeSummaryDe must not be empty');
                }
                await serverRuntime.db
                    .update(adminLegalImprints)
                    .set({ publishedAt: now, updatedAt: now })
                    .where(and(eq(adminLegalImprints.imprintId, documentId), isNull(adminLegalImprints.publishedAt)));
                await serverRuntime.publish.adminUpdates();
                return { success: true, referenceId: documentId };
            }
            default: {
                throw new Error(`adminLegalDocumentPublish: unsupported kind ${kind satisfies never}`);
            }
        }
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
