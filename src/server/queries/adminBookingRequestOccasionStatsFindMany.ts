import { and, count, countDistinct, desc, eq, gte, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { bookingRequestParticipants, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestOccasionStat, GqlSAdminBookingRequestOccasionStatsArgs, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { findManyTake } from '../utils/findManyTake';

/** Top occasions among booking requests (optional range; omit for all-time), by request count. */
export async function adminBookingRequestOccasionStatsFindMany(
    args: GqlSAdminBookingRequestOccasionStatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestOccasionStat[]> {
    try {
        const take = findManyTake(args.take);
        const filters: SQL[] = [];
        if (args.range != null) {
            const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
            filters.push(gte(bookingRequests.createdAt, startDateTime), lte(bookingRequests.createdAt, endDateTime));
        }

        const rows = await serverRuntime.db
            .select({
                occasion: bookingRequests.occasion,
                requestCount: countDistinct(bookingRequests.bookingRequestId),
                totalParticipants: count(bookingRequestParticipants.bookingRequestParticipantId),
            })
            .from(bookingRequests)
            .leftJoin(bookingRequestParticipants, eq(bookingRequestParticipants.bookingRequestId, bookingRequests.bookingRequestId))
            .where(filters.length > 0 ? and(...filters) : undefined)
            .groupBy(bookingRequests.occasion)
            .orderBy(desc(countDistinct(bookingRequests.bookingRequestId)), bookingRequests.occasion)
            .limit(take);

        return rows.map((row) => ({
            occasion: row.occasion,
            count: row.requestCount,
            totalParticipants: row.totalParticipants,
        }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
