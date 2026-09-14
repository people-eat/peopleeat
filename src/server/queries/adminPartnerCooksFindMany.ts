import { and, asc, eq, inArray } from 'drizzle-orm';

import { cooks, partnerCooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPartner, GqlSAdminPartnerCook } from '../graphql/generated';
import { toGqlAdminCook } from '../mappers/toGqlAdminCook';
import { publicCookListedWhere } from '../utils/publicCookFindManyCriterionWhere';

export async function adminPartnerCooksFindMany(parent: GqlSAdminPartner, serverRuntime: ServerRuntime): Promise<GqlSAdminPartnerCook[]> {
    const assigned = await serverRuntime.db
        .select({ cookId: partnerCooks.cookId, position: partnerCooks.position })
        .from(partnerCooks)
        .where(eq(partnerCooks.partnerId, parent.partnerId))
        .orderBy(asc(partnerCooks.position));

    if (assigned.length === 0) return [];

    const cookIds = assigned.map((row) => row.cookId);
    const cookRows = await serverRuntime.db
        .select({ cook: cooks, status: users.status })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(inArray(cooks.cookId, cookIds));
    const cooksById = new Map(cookRows.map((row) => [row.cook.cookId, row]));

    const listed = await serverRuntime.db
        .select({ cookId: cooks.cookId })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(and(inArray(cooks.cookId, cookIds), publicCookListedWhere(serverRuntime.db)));
    const listedIds = new Set(listed.map((row) => row.cookId));

    return assigned.flatMap((row) => {
        const matched = cooksById.get(row.cookId);
        if (!matched) return [];
        return [
            {
                position: row.position,
                cook: toGqlAdminCook(matched.cook, matched.status),
                isPubliclyListed: listedIds.has(row.cookId),
            },
        ];
    });
}
