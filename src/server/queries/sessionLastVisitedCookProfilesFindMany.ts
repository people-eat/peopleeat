import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { cooks, sessionEvents, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCook } from '../graphql/generated';
import { publicCookListedWhere } from '../utils/publicCookFindManyCriterionWhere';
import { publicCooksByIdFindMany } from '../utils/publicCookHydrate';

const DEFAULT_LIMIT = 4;
/** Newest matching visit rows to scan before dedupe / listed filter. */
const SCAN_LIMIT = 50;

/**
 * MRU unique public cook profiles this session visited (`WEB_PAGE_VISITED` /
 * `CHEFS` / `params.cookId`). Drops unlisted cooks; preserves visit order.
 */
export async function sessionLastVisitedCookProfilesFindMany(
    args: {
        sessionId: string;
        excludeCookId?: string | null;
        limit?: number;
    },
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicCook[]> {
    const limit = args.limit ?? DEFAULT_LIMIT;

    const rows = await serverRuntime.db
        .select({
            cookId: sql<string>`${sessionEvents.payload}->'params'->>'cookId'`,
        })
        .from(sessionEvents)
        .where(
            and(
                eq(sessionEvents.sessionId, args.sessionId),
                eq(sessionEvents.type, 'WEB_PAGE_VISITED'),
                sql`${sessionEvents.payload}->>'webPageKey' = 'CHEFS'`,
                sql`${sessionEvents.payload}->'params'->>'cookId' IS NOT NULL`,
            ),
        )
        .orderBy(desc(sessionEvents.createdAt))
        .limit(SCAN_LIMIT);

    const orderedUnique: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
        const cookId = row.cookId;
        if (!cookId || cookId === args.excludeCookId) continue;
        if (seen.has(cookId)) continue;
        seen.add(cookId);
        orderedUnique.push(cookId);
    }

    if (orderedUnique.length === 0) return [];

    const listed = await serverRuntime.db
        .select({ cookId: cooks.cookId })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(and(inArray(cooks.cookId, orderedUnique), publicCookListedWhere(serverRuntime.db)));
    const listedIds = new Set(listed.map((row) => row.cookId));

    const byId = await publicCooksByIdFindMany(serverRuntime.db, orderedUnique);
    const result: GqlSPublicCook[] = [];
    for (const cookId of orderedUnique) {
        if (!listedIds.has(cookId)) continue;
        const cook = byId.get(cookId);
        if (!cook) continue;
        result.push(cook);
        if (result.length >= limit) break;
    }
    return result;
}
