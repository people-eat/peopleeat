import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestConversionRate, GqlSAdminBookingRequestConversionRateArgs, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { adminBookingRequestDateBasisColumn } from './adminBookingRequestDateBasisColumn';

function parseCount(value: string | number | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return 0;
}

/** Request-level conversion rate in a range (dual-accept ÷ all requests). */
export async function adminBookingRequestConversionRateFindOne(
    args: GqlSAdminBookingRequestConversionRateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestConversionRate> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
        const dateBasis = args.dateBasis ?? 'createdAt';
        const dateColumn = adminBookingRequestDateBasisColumn(dateBasis);

        const result = await serverRuntime.db.execute<{
            request_count: string | number;
            converted_count: string | number;
        }>(sql`
            SELECT
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
            WHERE ${dateColumn} >= ${startDateTime}
              AND ${dateColumn} <= ${endDateTime}
        `);

        const rows = Array.isArray(result) ? result : result.rows;
        const row = rows[0];
        const requestCount = parseCount(row?.request_count);
        const convertedCount = parseCount(row?.converted_count);

        return {
            requestCount,
            convertedCount,
            rate: requestCount === 0 ? null : convertedCount / requestCount,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
