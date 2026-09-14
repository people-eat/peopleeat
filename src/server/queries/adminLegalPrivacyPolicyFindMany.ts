import { desc } from 'drizzle-orm';

import { adminLegalPrivacyPolicies } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminLegalPrivacyPolicy } from '../graphql/generated';
import { toGqlAdminLegalPrivacyPolicy } from '../mappers/toGqlAdminLegalPrivacyPolicy';

export async function adminLegalPrivacyPolicyFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminLegalPrivacyPolicy[]> {
    const rows = await serverRuntime.db.select().from(adminLegalPrivacyPolicies).orderBy(desc(adminLegalPrivacyPolicies.createdAt));
    return rows.map(toGqlAdminLegalPrivacyPolicy);
}
