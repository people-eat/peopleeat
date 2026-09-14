import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { sessionEvents, sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { SessionEventKey } from '../domain/sessionEvent';
import type { GqlSAdminSessionEvent, GqlSAdminSessionEventCriterion, GqlSSession } from '../graphql/generated';
import { toGqlAdminSessionEvent } from '../mappers/toGqlAdminSessionEvent';
import { findManySkip, findManyTake } from '../utils/findManyTake';

const MAX_TAKE = 200;

export async function adminSessionEventFindMany(
    criterion: GqlSAdminSessionEventCriterion,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    options?: { chronological?: boolean },
): Promise<GqlSAdminSessionEvent[]> {
    try {
        const hasSessionIds = Boolean(criterion.sessionIds && criterion.sessionIds.length > 0);
        const hasUserIds = Boolean(criterion.userIds && criterion.userIds.length > 0);
        if (!hasSessionIds && !hasUserIds) {
            throw new Error('adminSessionEventFindMany: sessionIds or userIds required');
        }

        const skip = findManySkip(criterion.skip);
        const take = Math.min(MAX_TAKE, findManyTake(criterion.take));
        const conditions = [];

        if (hasSessionIds) {
            conditions.push(inArray(sessionEvents.sessionId, criterion.sessionIds!));
        }
        if (criterion.types && criterion.types.length > 0) {
            conditions.push(inArray(sessionEvents.type, criterion.types as SessionEventKey[]));
        }

        const order = options?.chronological ? asc(sessionEvents.createdAt) : desc(sessionEvents.createdAt);

        if (criterion.userIds && criterion.userIds.length > 0) {
            const rows = await serverRuntime.db
                .select({ event: sessionEvents })
                .from(sessionEvents)
                .innerJoin(sessions, eq(sessionEvents.sessionId, sessions.sessionId))
                .where(and(inArray(sessions.userId, criterion.userIds), ...(conditions.length > 0 ? conditions : [])))
                .orderBy(order)
                .offset(skip)
                .limit(take);
            return rows.map((row) => toGqlAdminSessionEvent(row.event));
        }

        const rows = await serverRuntime.db
            .select()
            .from(sessionEvents)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(order)
            .offset(skip)
            .limit(take);

        return rows.map(toGqlAdminSessionEvent);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
