import { desc } from 'drizzle-orm';

import { partners } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPartner } from '../graphql/generated';
import { toGqlAdminPartner } from '../mappers/toGqlPartner';

export async function adminPartnerFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminPartner[]> {
    const rows = await serverRuntime.db.select().from(partners).orderBy(desc(partners.updatedAt));
    return rows.map(toGqlAdminPartner);
}
