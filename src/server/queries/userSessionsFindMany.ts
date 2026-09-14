import { and, desc, eq, isNull } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUser, GqlSUserSession } from '../graphql/generated';
import { toGqlUserSession } from '../mappers/toGqlUserSession';

export async function userSessionsFindMany(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserSession[]> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return [];
    }

    const rows = await serverRuntime.db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, parentUser.userId), isNull(sessions.wasTerminatedAt)))
        .orderBy(desc(sessions.lastInteractionAt));

    return rows.map((row) => toGqlUserSession(row, requestingSession.sessionId));
}
