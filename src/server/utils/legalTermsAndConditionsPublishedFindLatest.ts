import { desc, isNotNull } from 'drizzle-orm';

import { adminLegalTermsAndConditions } from '../db/schema';
import type { AdminLegalTermsAndConditions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export async function legalTermsAndConditionsPublishedFindLatest(
    serverRuntime: ServerRuntime,
): Promise<AdminLegalTermsAndConditions | null> {
    const [row] = await serverRuntime.db
        .select()
        .from(adminLegalTermsAndConditions)
        .where(isNotNull(adminLegalTermsAndConditions.publishedAt))
        .orderBy(desc(adminLegalTermsAndConditions.publishedAt))
        .limit(1);
    return row ?? null;
}
