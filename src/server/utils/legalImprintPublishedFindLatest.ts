import { desc, isNotNull } from 'drizzle-orm';

import { adminLegalImprints } from '../db/schema';
import type { AdminLegalImprint } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export async function legalImprintPublishedFindLatest(serverRuntime: ServerRuntime): Promise<AdminLegalImprint | null> {
    const [row] = await serverRuntime.db
        .select()
        .from(adminLegalImprints)
        .where(isNotNull(adminLegalImprints.publishedAt))
        .orderBy(desc(adminLegalImprints.publishedAt))
        .limit(1);
    return row ?? null;
}
