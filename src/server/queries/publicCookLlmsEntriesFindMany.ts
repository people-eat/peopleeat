import { inArray } from 'drizzle-orm';

import type { Database } from '../db';
import { users } from '../db/schema';
import { publicVisibleCookIdsFindMany } from '../utils/publicVisibleCookIdsFindMany';

export interface PublicCookLlmsEntry {
    cookId: string;
    displayName: string;
    city: string | null;
}

/** Listed public cooks in sitemap order, with the name and city `/llms.txt` prints. */
export async function publicCookLlmsEntriesFindMany(db: Database): Promise<PublicCookLlmsEntry[]> {
    const listed = await publicVisibleCookIdsFindMany(db);
    if (listed.length === 0) return [];
    const nameRows = await db
        .select({ userId: users.userId, firstName: users.firstName })
        .from(users)
        .where(
            inArray(
                users.userId,
                listed.map((row) => row.cookId),
            ),
        );
    const firstNameById = new Map(nameRows.map((row) => [row.userId, row.firstName]));
    const entries: PublicCookLlmsEntry[] = [];
    for (const row of listed) {
        const stageName = row.cook.stageName?.trim() ?? '';
        const firstName = firstNameById.get(row.cookId)?.trim() ?? '';
        const displayName = stageName || firstName;
        if (!displayName) continue;
        const city = row.cook.exactTravelOriginAddress?.city.trim() || row.cook.legacyCityName?.trim() || null;
        entries.push({ cookId: row.cookId, displayName, city: city || null });
    }
    return entries;
}
