import { desc, eq } from 'drizzle-orm';

import { authPasskeys } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAuthPasskey, GqlSSession, GqlSUser } from '../graphql/generated';
import { toGqlAuthPasskey } from '../mappers/toGqlAuthPasskey';

export async function userPasskeysFindMany(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAuthPasskey[]> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return [];
    }

    const rows = await serverRuntime.db
        .select()
        .from(authPasskeys)
        .where(eq(authPasskeys.userId, parentUser.userId))
        .orderBy(desc(authPasskeys.createdAt));

    return rows.map(toGqlAuthPasskey);
}
