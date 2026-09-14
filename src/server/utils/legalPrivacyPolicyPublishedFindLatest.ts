import { desc, isNotNull } from 'drizzle-orm';

import { adminLegalPrivacyPolicies } from '../db/schema';
import type { AdminLegalPrivacyPolicy } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export async function legalPrivacyPolicyPublishedFindLatest(serverRuntime: ServerRuntime): Promise<AdminLegalPrivacyPolicy | null> {
    const [row] = await serverRuntime.db
        .select()
        .from(adminLegalPrivacyPolicies)
        .where(isNotNull(adminLegalPrivacyPolicies.publishedAt))
        .orderBy(desc(adminLegalPrivacyPolicies.publishedAt))
        .limit(1);
    return row ?? null;
}
