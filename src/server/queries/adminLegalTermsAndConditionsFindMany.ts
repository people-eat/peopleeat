import { desc } from 'drizzle-orm';

import { adminLegalTermsAndConditions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminLegalTermsAndConditions } from '../graphql/generated';
import { toGqlAdminLegalTermsAndConditions } from '../mappers/toGqlAdminLegalTermsAndConditions';

export async function adminLegalTermsAndConditionsFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminLegalTermsAndConditions[]> {
    const rows = await serverRuntime.db.select().from(adminLegalTermsAndConditions).orderBy(desc(adminLegalTermsAndConditions.createdAt));
    return rows.map(toGqlAdminLegalTermsAndConditions);
}
