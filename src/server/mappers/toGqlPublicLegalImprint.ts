import type { AdminLegalImprint } from '../db/schema';
import type { GqlSPublicLegalImprint } from '../graphql/generated';

export function toGqlPublicLegalImprint(row: AdminLegalImprint): GqlSPublicLegalImprint {
    if (!row.publishedAt) {
        throw new Error('toGqlPublicLegalImprint: publishedAt is required');
    }
    return {
        imprintId: row.imprintId,
        bodyDe: row.bodyDe,
        changeSummaryDe: row.changeSummaryDe,
        publishedAt: row.publishedAt,
    };
}
