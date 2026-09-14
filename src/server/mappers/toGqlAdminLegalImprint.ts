import type { AdminLegalImprint } from '../db/schema';
import type { GqlSAdminLegalImprint } from '../graphql/generated';

export function toGqlAdminLegalImprint(row: AdminLegalImprint): GqlSAdminLegalImprint {
    return {
        imprintId: row.imprintId,
        bodyDe: row.bodyDe,
        changeSummaryDe: row.changeSummaryDe,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        publishedAt: row.publishedAt,
    };
}
