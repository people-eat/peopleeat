import { desc, eq } from 'drizzle-orm';

import { authOauthIdentities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAuthOauthIdentity, GqlSAdminUser } from '../graphql/generated';

export async function adminUserOauthIdentitiesFindMany(
    parent: Pick<GqlSAdminUser, 'userId'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAuthOauthIdentity[]> {
    const rows = await serverRuntime.db
        .select({
            provider: authOauthIdentities.provider,
            createdAt: authOauthIdentities.createdAt,
        })
        .from(authOauthIdentities)
        .where(eq(authOauthIdentities.userId, parent.userId))
        .orderBy(desc(authOauthIdentities.createdAt));

    return rows.map((row) => ({
        provider: row.provider,
        createdAt: row.createdAt,
    }));
}
