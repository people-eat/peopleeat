import { count, isNull } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export async function adminMapCooksMissingOriginCount(serverRuntime: ServerRuntime): Promise<number> {
    const [row] = await serverRuntime.db.select({ value: count() }).from(cooks).where(isNull(cooks.exactTravelOriginAddress));
    return Number(row?.value ?? 0);
}
