import type { AdminLegalTermsAndConditions } from '../db/schema';
import type { GqlSAdminLegalTermsAndConditions } from '../graphql/generated';

export function toGqlAdminLegalTermsAndConditions(row: AdminLegalTermsAndConditions): GqlSAdminLegalTermsAndConditions {
    return {
        termsAndConditionsId: row.termsAndConditionsId,
        bodyDe: row.bodyDe,
        changeSummaryDe: row.changeSummaryDe,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        publishedAt: row.publishedAt,
    };
}
