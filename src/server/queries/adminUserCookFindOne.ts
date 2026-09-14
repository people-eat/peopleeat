import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCook, GqlSAdminUser } from '../graphql/generated';
import { toGqlAdminCook } from '../mappers/toGqlAdminCook';

export async function adminUserCookFindOne(parent: GqlSAdminUser, serverRuntime: ServerRuntime): Promise<GqlSAdminCook | null> {
    const [row] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, parent.userId)).limit(1);
    return row ? toGqlAdminCook(row, parent.status) : null;
}
