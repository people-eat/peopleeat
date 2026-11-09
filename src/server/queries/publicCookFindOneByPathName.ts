import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCook, GqlSPublicCookQueryFindOneByPathNameArgs } from '../graphql/generated';
import { cookFindByPathNameAny } from '../utils/cookPathName';
import { publicCooksByIdFindMany } from '../utils/publicCookHydrate';

/** Single public cook by current pathName, archived slug, or legacy cookId. */
export async function publicCookFindOneByPathName(
    args: GqlSPublicCookQueryFindOneByPathNameArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicCook | null> {
    const row = await cookFindByPathNameAny(serverRuntime.db, args.pathName);
    if (!row || !row.isVisible || !row.isApprovedByAdmin) return null;

    const [user] = await serverRuntime.db.select({ status: users.status }).from(users).where(eq(users.userId, row.cookId)).limit(1);
    if (!user || user.status !== 'ACTIVE') return null;

    const byId = await publicCooksByIdFindMany(serverRuntime.db, [row.cookId]);
    return byId.get(row.cookId) ?? null;
}
