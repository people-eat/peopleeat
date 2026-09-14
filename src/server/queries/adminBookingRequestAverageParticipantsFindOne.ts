import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

/** Average participant count per booking request, all-time. 0 when none. */
export async function adminBookingRequestAverageParticipantsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number> {
    try {
        const result = await serverRuntime.db.execute<{ average_participants: string | number | null }>(sql`
            SELECT COALESCE(ROUND(AVG(per_request.n)), 0)::int AS average_participants
            FROM (
                SELECT COUNT(p."bookingRequestParticipantId")::int AS n
                FROM "BookingRequests" br
                LEFT JOIN "BookingRequestParticipants" p
                  ON p."bookingRequestId" = br."bookingRequestId"
                GROUP BY br."bookingRequestId"
            ) per_request
        `);

        const rows = Array.isArray(result) ? result : result.rows;
        const value = rows[0]?.average_participants;
        if (value == null) return 0;
        return typeof value === 'number' ? value : Number(value);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
