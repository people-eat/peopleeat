import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSSession, GqlSUser } from '../graphql/generated';
import { toGqlCook } from '../mappers/toGqlCook';

// Cook membership probe — same ownership + 1:1-row pattern as `User.admin`.
// Profile switches cook vs customer UI on nullability.
export async function userCookFindOne(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCook | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }
    const [row] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, parentUser.userId)).limit(1);
    return row ? toGqlCook(row, parentUser.status) : null;
}
