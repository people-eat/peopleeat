import { and, asc, eq, sql } from 'drizzle-orm';

import { sessionEvents, sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSession } from '../graphql/generated';
import { toGqlAdminSession } from '../mappers/toGqlAdminSession';

/**
 * Creating browser sessions for admin booking requests, via the earliest
 * `BOOKING_REQUEST_CREATED` event whose payload includes each id. Missing ids
 * are omitted (admin-created, imported predecessor empty payload, missing).
 */
export async function adminBookingRequestCreatingSessionsByRequestIdFind(
    bookingRequestIds: readonly string[],
    serverRuntime: ServerRuntime,
): Promise<Map<string, GqlSAdminSession>> {
    const sessionsByRequestId = new Map<string, GqlSAdminSession>();
    const uniqueIds = [...new Set(bookingRequestIds)];
    if (uniqueIds.length === 0) return sessionsByRequestId;

    const rows = await serverRuntime.db
        .select({
            bookingRequestId: sql<string>`${sessionEvents.payload}->>'bookingRequestId'`.as('bookingRequestId'),
            session: sessions,
        })
        .from(sessionEvents)
        .innerJoin(sessions, eq(sessionEvents.sessionId, sessions.sessionId))
        .where(
            and(
                eq(sessionEvents.type, 'BOOKING_REQUEST_CREATED'),
                sql`${sessionEvents.payload}->>'bookingRequestId' IN (${sql.join(
                    uniqueIds.map((id) => sql`${id}`),
                    sql`, `,
                )})`,
            ),
        )
        .orderBy(asc(sessionEvents.createdAt));

    for (const row of rows) {
        if (sessionsByRequestId.has(row.bookingRequestId)) continue;
        sessionsByRequestId.set(row.bookingRequestId, toGqlAdminSession(row.session));
    }

    return sessionsByRequestId;
}
