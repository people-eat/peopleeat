import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminTimeBucket,
    GqlSAdminTimeBucketGranularity,
    GqlSDateTimeRange,
    GqlSSession,
    GqlSWebPageKey,
} from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

export async function adminSessionEventWebPageVisitCreationsFindMany(
    webPageKey: GqlSWebPageKey,
    range: GqlSDateTimeRange,
    granularity: GqlSAdminTimeBucketGranularity,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(range);
        const truncUnit = granularity === 'week' ? 'week' : granularity === 'month' ? 'month' : 'day';
        const step =
            truncUnit === 'week' ? sql`interval '1 week'` : truncUnit === 'month' ? sql`interval '1 month'` : sql`interval '1 day'`;
        const truncLiteral = sql.raw(`'${truncUnit}'`);

        const result = await serverRuntime.db.execute<{ bucket_start: Date; count: string | number }>(sql`
            SELECT
                series.bucket_start AS bucket_start,
                COALESCE(counts.value, 0)::int AS count
            FROM generate_series(
                date_trunc(${truncLiteral}, ${startDateTime}::timestamptz),
                date_trunc(${truncLiteral}, ${endDateTime}::timestamptz),
                ${step}
            ) AS series(bucket_start)
            LEFT JOIN (
                SELECT
                    date_trunc(${truncLiteral}, "createdAt") AS bucket_start,
                    COUNT(*)::int AS value
                FROM "SessionEvents"
                WHERE type = 'WEB_PAGE_VISITED'
                  AND payload->>'webPageKey' = ${webPageKey}
                  AND "createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                  AND "createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
                GROUP BY 1
            ) AS counts ON counts.bucket_start = series.bucket_start
            ORDER BY series.bucket_start ASC
        `);

        const rows = Array.isArray(result) ? result : result.rows;

        return rows.map((row) => ({
            bucketStart: row.bucket_start instanceof Date ? row.bucket_start : new Date(row.bucket_start),
            count: typeof row.count === 'number' ? row.count : Number(row.count),
        }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
