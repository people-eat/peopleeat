import { eq } from 'drizzle-orm';

import { logs } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminLog, GqlSAdminLogArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminLog } from '../mappers/toGqlAdminLog';

export async function adminLogFindOne(
    args: GqlSAdminLogArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminLog | null> {
    try {
        const [row] = await serverRuntime.db.select().from(logs).where(eq(logs.logId, args.logId)).limit(1);
        if (!row) {
            return null;
        }
        return toGqlAdminLog(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
