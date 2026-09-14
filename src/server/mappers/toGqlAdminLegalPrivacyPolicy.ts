import type { AdminLegalPrivacyPolicy } from '../db/schema';
import type { GqlSAdminLegalPrivacyPolicy } from '../graphql/generated';

export function toGqlAdminLegalPrivacyPolicy(row: AdminLegalPrivacyPolicy): GqlSAdminLegalPrivacyPolicy {
    return {
        privacyPolicyId: row.privacyPolicyId,
        bodyDe: row.bodyDe,
        changeSummaryDe: row.changeSummaryDe,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        publishedAt: row.publishedAt,
    };
}
