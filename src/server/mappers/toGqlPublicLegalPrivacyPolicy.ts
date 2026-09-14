import type { AdminLegalPrivacyPolicy } from '../db/schema';
import type { GqlSPublicLegalPrivacyPolicy } from '../graphql/generated';

export function toGqlPublicLegalPrivacyPolicy(row: AdminLegalPrivacyPolicy): GqlSPublicLegalPrivacyPolicy {
    if (!row.publishedAt) {
        throw new Error('toGqlPublicLegalPrivacyPolicy: publishedAt is required');
    }
    return {
        privacyPolicyId: row.privacyPolicyId,
        bodyDe: row.bodyDe,
        changeSummaryDe: row.changeSummaryDe,
        publishedAt: row.publishedAt,
    };
}
