import { and, eq } from 'drizzle-orm';

import { cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCook, GqlSPublicCookQueryFindOneArgs } from '../graphql/generated';
import { publicCooksByIdFindMany } from '../utils/publicCookHydrate';

/** Single public cook by id; null when missing, non-ACTIVE, or not publicly listed. */
export async function publicCookFindOne(
    args: GqlSPublicCookQueryFindOneArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicCook | null> {
    const [row] = await serverRuntime.db
        .select({ cookId: cooks.cookId })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(and(eq(cooks.cookId, args.cookId), eq(cooks.isVisible, true), eq(cooks.isApprovedByAdmin, true), eq(users.status, 'ACTIVE')))
        .limit(1);
    if (!row) return null;

    const byId = await publicCooksByIdFindMany(serverRuntime.db, [row.cookId]);
    return byId.get(row.cookId) ?? null;
}
