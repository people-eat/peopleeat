import { desc, eq } from 'drizzle-orm';

import { authPasskeys } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminUser, GqlSAuthPasskey } from '../graphql/generated';
import { toGqlAuthPasskey } from '../mappers/toGqlAuthPasskey';

export async function adminUserPasskeysFindMany(
    parent: Pick<GqlSAdminUser, 'userId'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSAuthPasskey[]> {
    const rows = await serverRuntime.db
        .select()
        .from(authPasskeys)
        .where(eq(authPasskeys.userId, parent.userId))
        .orderBy(desc(authPasskeys.createdAt));

    return rows.map(toGqlAuthPasskey);
}
