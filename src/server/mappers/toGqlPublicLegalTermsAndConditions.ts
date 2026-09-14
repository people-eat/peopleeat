import type { AdminLegalTermsAndConditions } from '../db/schema';
import type { GqlSPublicLegalTermsAndConditions } from '../graphql/generated';

export function toGqlPublicLegalTermsAndConditions(row: AdminLegalTermsAndConditions): GqlSPublicLegalTermsAndConditions {
    if (!row.publishedAt) {
        throw new Error('toGqlPublicLegalTermsAndConditions: publishedAt is required');
    }
    return {
        termsAndConditionsId: row.termsAndConditionsId,
        bodyDe: row.bodyDe,
        changeSummaryDe: row.changeSummaryDe,
        publishedAt: row.publishedAt,
    };
}
