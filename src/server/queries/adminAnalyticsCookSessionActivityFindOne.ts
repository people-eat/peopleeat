import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsCookSessionActivity, GqlSAdminTimeBucket, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

type BucketRow = {
    bucket_start: Date;
    count: string | number;
};

function parseCount(value: string | number | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return 0;
}

function toTimeBuckets(rows: BucketRow[]): GqlSAdminTimeBucket[] {
    return rows.map((row) => ({
        bucketStart: row.bucket_start instanceof Date ? row.bucket_start : new Date(row.bucket_start),
        count: parseCount(row.count),
    }));
}

const qualifyingCookSessions = sql`
    FROM "Sessions" s
    INNER JOIN "Cooks" c ON c."cookId" = s."userId"
    LEFT JOIN "Admins" a ON a."adminId" = s."userId"
    WHERE s."isBot" = false
      AND s."impersonationReturnSessionId" IS NULL
      AND a."adminId" IS NULL
`;

async function cookSessionActivityBuckets(
    startDateTime: Date,
    endDateTime: Date,
    truncUnit: 'week' | 'month',
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    const truncLiteral = sql.raw(`'${truncUnit}'`);
    const step = truncUnit === 'week' ? sql`interval '1 week'` : sql`interval '1 month'`;
    const result = await serverRuntime.db.execute<BucketRow>(sql`
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
                date_trunc(${truncLiteral}, s."lastInteractionAt") AS bucket_start,
                COUNT(DISTINCT c."cookId")::int AS value
            ${qualifyingCookSessions}
              AND s."lastInteractionAt" >= ${startDateTime}
              AND s."lastInteractionAt" <= ${endDateTime}
            GROUP BY 1
        ) AS counts ON counts.bucket_start = series.bucket_start
        ORDER BY series.bucket_start ASC
    `);
    const rows = Array.isArray(result) ? result : result.rows;
    return toTimeBuckets(rows);
}

/** Distinct cooks with a qualifying session last-touch in range, plus week/month series. */
export async function adminAnalyticsCookSessionActivityFindOne(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsCookSessionActivity> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(range);

        const [countResult, productiveResult, weekBuckets, monthBuckets] = await Promise.all([
            serverRuntime.db.execute<{ cook_count: string | number }>(sql`
                SELECT COUNT(DISTINCT c."cookId")::int AS cook_count
                ${qualifyingCookSessions}
                  AND s."lastInteractionAt" >= ${startDateTime}
                  AND s."lastInteractionAt" <= ${endDateTime}
            `),
            serverRuntime.db.execute<{ productive_cook_count: string | number }>(sql`
                SELECT COUNT(DISTINCT o."cookId")::int AS productive_cook_count
                FROM "BookingRequestOffers" o
                INNER JOIN "Cooks" c ON c."cookId" = o."cookId"
                LEFT JOIN "Admins" a ON a."adminId" = o."cookId"
                WHERE a."adminId" IS NULL
                  AND o."createdAt" >= ${startDateTime}
                  AND o."createdAt" <= ${endDateTime}
            `),
            cookSessionActivityBuckets(startDateTime, endDateTime, 'week', serverRuntime),
            cookSessionActivityBuckets(startDateTime, endDateTime, 'month', serverRuntime),
        ]);

        const countRows = Array.isArray(countResult) ? countResult : countResult.rows;
        const productiveRows = Array.isArray(productiveResult) ? productiveResult : productiveResult.rows;
        return {
            cookCount: parseCount(countRows[0]?.cook_count),
            productiveCookCount: parseCount(productiveRows[0]?.productive_cook_count),
            weekBuckets,
            monthBuckets,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
