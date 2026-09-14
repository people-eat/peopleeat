import { eq } from 'drizzle-orm';

import { cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCook, GqlSAdminCookTestimonial } from '../graphql/generated';
import { toGqlAdminCook } from '../mappers/toGqlAdminCook';

/** `AdminCookTestimonial.cook` field resolver. */
export async function adminCookTestimonialCookFindOne(
    parent: GqlSAdminCookTestimonial,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCook> {
    const [row] = await serverRuntime.db
        .select({ cook: cooks, status: users.status })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(eq(cooks.cookId, parent.cookId))
        .limit(1);
    if (!row) {
        throw new Error(`adminCookTestimonialCookFindOne: cook missing for cookId ${parent.cookId}`);
    }
    return toGqlAdminCook(row.cook, row.status);
}
