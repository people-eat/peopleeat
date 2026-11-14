import { asc, eq } from 'drizzle-orm';

import { cookInviteRewards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookInviteReward } from '../graphql/generated';

export async function adminCookInviteRewardsFindMany(cookId: string, serverRuntime: ServerRuntime): Promise<GqlSAdminCookInviteReward[]> {
    const rows = await serverRuntime.db
        .select()
        .from(cookInviteRewards)
        .where(eq(cookInviteRewards.cookId, cookId))
        .orderBy(asc(cookInviteRewards.createdAt));

    return rows.map((row) => ({
        cookInviteRewardId: row.cookInviteRewardId,
        fromInviteeCookId: row.fromInviteeCookId,
        terms: row.terms,
        consumption: row.consumption,
        status: row.status,
        createdAt: row.createdAt,
        lastModifiedAt: row.lastModifiedAt,
    }));
}
