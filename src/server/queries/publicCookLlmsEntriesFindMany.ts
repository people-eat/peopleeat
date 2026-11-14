import { asc, eq } from 'drizzle-orm';

import type { Database } from '../db';
import { cooks, users } from '../db/schema';
import { publicCookListedWhere } from '../utils/publicCookFindManyCriterionWhere';

export interface PublicCookLlmsEntry {
    pathName: string;
    displayName: string;
    city: string | null;
}

/**
 * Listed public cooks for `/llms.txt`.
 * One lean select (no review-rank EXISTS) so Lighthouse's 2s fetch budget stays reachable on a cold origin.
 */
export async function publicCookLlmsEntriesFindMany(db: Database): Promise<PublicCookLlmsEntry[]> {
    const rows = await db
        .select({
            pathName: cooks.pathName,
            stageName: cooks.stageName,
            firstName: users.firstName,
            exactTravelOriginAddress: cooks.exactTravelOriginAddress,
            legacyCityName: cooks.legacyCityName,
        })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(publicCookListedWhere(db))
        .orderBy(asc(users.firstName), asc(cooks.pathName));

    const entries: PublicCookLlmsEntry[] = [];
    for (const row of rows) {
        const stageName = row.stageName?.trim() ?? '';
        const firstName = row.firstName.trim();
        const displayName = stageName || firstName;
        if (!displayName) continue;
        const city = row.exactTravelOriginAddress?.city.trim() || row.legacyCityName?.trim() || null;
        entries.push({ pathName: row.pathName, displayName, city: city || null });
    }
    return entries;
}
