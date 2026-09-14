import { eq } from 'drizzle-orm';

import { occasions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOccasion, GqlSAdminOccasionArgs } from '../graphql/generated';
import { toGqlAdminOccasion } from '../mappers/toGqlOccasion';

export async function adminOccasionFindOne(args: GqlSAdminOccasionArgs, serverRuntime: ServerRuntime): Promise<GqlSAdminOccasion | null> {
    const [row] = await serverRuntime.db.select().from(occasions).where(eq(occasions.occasionId, args.occasionId)).limit(1);
    return row ? toGqlAdminOccasion(row) : null;
}
