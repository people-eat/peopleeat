import { desc } from 'drizzle-orm';

import { adminLegalImprints } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminLegalImprint } from '../graphql/generated';
import { toGqlAdminLegalImprint } from '../mappers/toGqlAdminLegalImprint';

export async function adminLegalImprintFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminLegalImprint[]> {
    const rows = await serverRuntime.db.select().from(adminLegalImprints).orderBy(desc(adminLegalImprints.createdAt));
    return rows.map(toGqlAdminLegalImprint);
}
