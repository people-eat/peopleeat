import { and, asc, eq, sql } from 'drizzle-orm';

import { sessionEvents, sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSession } from '../graphql/generated';
import { toGqlAdminSession } from '../mappers/toGqlAdminSession';

/**
 * Creating browser session for an admin booking request, via the earliest
 * `BOOKING_REQUEST_CREATED` event whose payload includes `bookingRequestId`.
 * Null when none (admin-created, imported predecessor empty payload, missing).
 */
export async function adminBookingRequestCreatingSessionFindOne(
    bookingRequestId: string,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminSession | null> {
    const [row] = await serverRuntime.db
        .select({ session: sessions })
        .from(sessionEvents)
        .innerJoin(sessions, eq(sessionEvents.sessionId, sessions.sessionId))
        .where(
            and(
                eq(sessionEvents.type, 'BOOKING_REQUEST_CREATED'),
                sql`${sessionEvents.payload}->>'bookingRequestId' = ${bookingRequestId}`,
            ),
        )
        .orderBy(asc(sessionEvents.createdAt))
        .limit(1);

    return row ? toGqlAdminSession(row.session) : null;
}
