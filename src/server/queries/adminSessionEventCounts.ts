import { and, count, eq, inArray } from 'drizzle-orm';

import { sessionEvents, sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { SessionEventKey } from '../domain/sessionEvent';
import type { GqlSAdminSessionEventCriterion, GqlSAdminSessionEventsCountsArgs, GqlSSession } from '../graphql/generated';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminSessionEventCountOne(criterion: GqlSAdminSessionEventCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const hasSessionIds = Boolean(criterion.sessionIds && criterion.sessionIds.length > 0);
    const hasUserIds = Boolean(criterion.userIds && criterion.userIds.length > 0);
    if (!hasSessionIds && !hasUserIds) {
        throw new Error('adminSessionEventCounts: sessionIds or userIds required');
    }

    const conditions = [];

    if (hasSessionIds) {
        conditions.push(inArray(sessionEvents.sessionId, criterion.sessionIds!));
    }
    if (criterion.types && criterion.types.length > 0) {
        conditions.push(inArray(sessionEvents.type, criterion.types as SessionEventKey[]));
    }

    if (criterion.userIds && criterion.userIds.length > 0) {
        const [row] = await serverRuntime.db
            .select({ value: count() })
            .from(sessionEvents)
            .innerJoin(sessions, eq(sessionEvents.sessionId, sessions.sessionId))
            .where(and(inArray(sessions.userId, criterion.userIds), ...(conditions.length > 0 ? conditions : [])));
        return row?.value ?? 0;
    }

    const [row] = await serverRuntime.db
        .select({ value: count() })
        .from(sessionEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    return row?.value ?? 0;
}

export async function adminSessionEventCounts(
    args: GqlSAdminSessionEventsCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminSessionEventCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminSessionEventCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminSessionEventCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
