import { isNotNull } from 'drizzle-orm';

import { partners } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMapPartnerPoint } from '../graphql/generated';

export async function adminMapPartnerPointsFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminMapPartnerPoint[]> {
    const rows = await serverRuntime.db
        .select({
            partnerId: partners.partnerId,
            name: partners.name,
            locationAddress: partners.locationAddress,
            publishedAt: partners.publishedAt,
        })
        .from(partners)
        .where(isNotNull(partners.locationAddress));

    return rows.flatMap((row) => {
        const address = row.locationAddress;
        if (!address) return [];
        return [
            {
                partnerId: row.partnerId,
                latitude: address.latitude,
                longitude: address.longitude,
                name: row.name,
                published: row.publishedAt != null,
            },
        ];
    });
}
