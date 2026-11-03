import { count, isNull } from 'drizzle-orm';

import { partners } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export async function adminMapPartnersMissingLocationCount(serverRuntime: ServerRuntime): Promise<number> {
    const [row] = await serverRuntime.db.select({ value: count() }).from(partners).where(isNull(partners.locationAddress));
    return Number(row?.value ?? 0);
}
