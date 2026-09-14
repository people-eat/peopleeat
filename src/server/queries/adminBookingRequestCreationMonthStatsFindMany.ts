import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminBookingRequestCreationMonthStat,
    GqlSAdminBookingRequestCreationMonthStatsArgs,
    GqlSSession,
} from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { findManyTake } from '../utils/findManyTake';

/** Top calendar months among booking-request creations (optional range; omit for all-time), by count. */
export async function adminBookingRequestCreationMonthStatsFindMany(
    args: GqlSAdminBookingRequestCreationMonthStatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestCreationMonthStat[]> {
    try {
        const take = findManyTake(args.take);
        const rangeFilter =
            args.range != null
                ? (() => {
                      const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
                      return sql`AND br."createdAt" >= ${startDateTime} AND br."createdAt" <= ${endDateTime}`;
                  })()
                : sql``;

        const result = await serverRuntime.db.execute<{
            month_start: Date;
            request_count: string | number;
            total_participants: string | number;
        }>(sql`
            SELECT
                date_trunc('month', br."createdAt") AS month_start,
                COUNT(DISTINCT br."bookingRequestId")::int AS request_count,
                COUNT(p."bookingRequestParticipantId")::int AS total_participants
            FROM "BookingRequests" br
            LEFT JOIN "BookingRequestParticipants" p
              ON p."bookingRequestId" = br."bookingRequestId"
            WHERE TRUE
              ${rangeFilter}
            GROUP BY 1
            ORDER BY request_count DESC, month_start ASC
            LIMIT ${take}
        `);

        const rows = Array.isArray(result) ? result : result.rows;

        return rows.map((row) => ({
            monthStart: row.month_start instanceof Date ? row.month_start : new Date(row.month_start),
            count: typeof row.request_count === 'number' ? row.request_count : Number(row.request_count),
            totalParticipants: typeof row.total_participants === 'number' ? row.total_participants : Number(row.total_participants),
        }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
