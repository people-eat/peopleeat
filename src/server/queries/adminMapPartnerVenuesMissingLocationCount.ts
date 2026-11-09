import { count, isNull } from 'drizzle-orm';

import { partnerVenues } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export async function adminMapPartnerVenuesMissingLocationCount(serverRuntime: ServerRuntime): Promise<number> {
    const [row] = await serverRuntime.db.select({ value: count() }).from(partnerVenues).where(isNull(partnerVenues.locationAddress));
    return Number(row?.value ?? 0);
}
