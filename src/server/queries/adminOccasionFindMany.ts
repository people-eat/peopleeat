import { desc } from 'drizzle-orm';

import { occasions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOccasion } from '../graphql/generated';
import { toGqlAdminOccasion } from '../mappers/toGqlOccasion';

export async function adminOccasionFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminOccasion[]> {
    const rows = await serverRuntime.db.select().from(occasions).orderBy(desc(occasions.updatedAt));
    return rows.map(toGqlAdminOccasion);
}
