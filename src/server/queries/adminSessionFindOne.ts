import { eq } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSession, GqlSAdminSessionArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminSession } from '../mappers/toGqlAdminSession';

export async function adminSessionFindOne(
    args: GqlSAdminSessionArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminSession | null> {
    try {
        const [row] = await serverRuntime.db.select().from(sessions).where(eq(sessions.sessionId, args.sessionId)).limit(1);
        if (!row) {
            return null;
        }
        return toGqlAdminSession(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
