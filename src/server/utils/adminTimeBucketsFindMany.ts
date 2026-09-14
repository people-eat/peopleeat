import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTimeBucket, GqlSAdminTimeBucketGranularity, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from './dateTimeRangeNormalize';

type AdminTimeBucketTable =
    | '"Users"'
    | '"Sessions"'
    | '"Logs"'
    | '"AiGenerations"'
    | '"BookingRequests"'
    | '"Chats"'
    | '"CookCallSlotBookings"'
    | '"BookingRequestOfferCallRooms"'
    | '"OutboundEmails"'
    | '"GiftCards"';

type AdminTimeBucketTimestampColumn = '"createdAt"' | '"startedAt"';

export async function adminTimeBucketsFindMany(
    table: AdminTimeBucketTable,
    range: GqlSDateTimeRange,
    granularity: GqlSAdminTimeBucketGranularity,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    timestampColumn: AdminTimeBucketTimestampColumn = '"createdAt"',
    /** Extra AND conditions inside the counts subquery (e.g. payment status). */
    countsWhereSql?: SQL,
): Promise<GqlSAdminTimeBucket[]> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(range);
        const truncUnit = granularity === 'week' ? 'week' : granularity === 'month' ? 'month' : 'day';
        const step =
            truncUnit === 'week' ? sql`interval '1 week'` : truncUnit === 'month' ? sql`interval '1 month'` : sql`interval '1 day'`;
        const truncLiteral = sql.raw(`'${truncUnit}'`);
        const timestampLiteral = sql.raw(timestampColumn);
        const countsExtraWhere = countsWhereSql ? sql`AND ${countsWhereSql}` : sql``;

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
                    date_trunc(${truncLiteral}, ${timestampLiteral}) AS bucket_start,
                    COUNT(*)::int AS value
                FROM ${sql.raw(table)}
                WHERE ${timestampLiteral} >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                  AND ${timestampLiteral} < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
                  ${countsExtraWhere}
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
