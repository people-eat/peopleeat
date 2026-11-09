import { eq, isNotNull } from 'drizzle-orm';

import { partners, partnerVenues } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMapPartnerVenuePoint } from '../graphql/generated';

export async function adminMapPartnerVenuePointsFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminMapPartnerVenuePoint[]> {
    const rows = await serverRuntime.db
        .select({
            partnerVenueId: partnerVenues.partnerVenueId,
            partnerId: partnerVenues.partnerId,
            partnerName: partners.name,
            name: partnerVenues.name,
            locationAddress: partnerVenues.locationAddress,
            publishedAt: partnerVenues.publishedAt,
        })
        .from(partnerVenues)
        .innerJoin(partners, eq(partners.partnerId, partnerVenues.partnerId))
        .where(isNotNull(partnerVenues.locationAddress));

    return rows.flatMap((row) => {
        const address = row.locationAddress;
        if (!address) return [];
        return [
            {
                partnerVenueId: row.partnerVenueId,
                partnerId: row.partnerId,
                partnerName: row.partnerName,
                latitude: address.latitude,
                longitude: address.longitude,
                name: row.name,
                published: row.publishedAt != null,
            },
        ];
    });
}
