import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminBookingRequestConversionMonthBucket,
    GqlSAdminBookingRequestConversionMonthStatsArgs,
    GqlSSession,
} from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { adminBookingRequestDateBasisColumn } from './adminBookingRequestDateBasisColumn';

function parseCount(value: string | number | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return 0;
}

/** Zero-filled monthly request-level conversion series in a range. */
export async function adminBookingRequestConversionMonthStatsFindMany(
    args: GqlSAdminBookingRequestConversionMonthStatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestConversionMonthBucket[]> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
        const dateBasis = args.dateBasis ?? 'createdAt';
        const dateColumn = adminBookingRequestDateBasisColumn(dateBasis);

        const result = await serverRuntime.db.execute<{
            month_start: Date;
            request_count: string | number;
            converted_count: string | number;
        }>(sql`
            SELECT
                series.month_start AS month_start,
                COALESCE(counts.request_count, 0)::int AS request_count,
                COALESCE(counts.converted_count, 0)::int AS converted_count
            FROM generate_series(
                date_trunc('month', ${startDateTime}::timestamptz),
                date_trunc('month', ${endDateTime}::timestamptz),
                interval '1 month'
            ) AS series(month_start)
            LEFT JOIN (
                SELECT
                    date_trunc('month', ${dateColumn}) AS month_start,
                    COUNT(*)::int AS request_count,
                    COUNT(*) FILTER (
                        WHERE EXISTS (
                            SELECT 1
                            FROM "BookingRequestOffers" o
                            WHERE o."bookingRequestId" = br."bookingRequestId"
                              AND o."userAccepted" = true
                              AND o."cookAccepted" = true
                        )
                    )::int AS converted_count
                FROM "BookingRequests" br
                WHERE ${dateColumn} >= date_trunc('month', ${startDateTime}::timestamptz)
                  AND ${dateColumn} < date_trunc('month', ${endDateTime}::timestamptz) + interval '1 month'
                  AND ${dateColumn} >= ${startDateTime}
                  AND ${dateColumn} <= ${endDateTime}
                GROUP BY 1
            ) AS counts ON counts.month_start = series.month_start
            ORDER BY series.month_start ASC
        `);

        const rows = Array.isArray(result) ? result : result.rows;

        return rows.map((row) => {
            const requestCount = parseCount(row.request_count);
            const convertedCount = parseCount(row.converted_count);
            return {
                monthStart: row.month_start instanceof Date ? row.month_start : new Date(row.month_start),
                requestCount,
                convertedCount,
                rate: requestCount === 0 ? 0 : convertedCount / requestCount,
            };
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
