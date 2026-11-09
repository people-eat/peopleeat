import { desc, inArray } from 'drizzle-orm';

import { partners, partnerVenues } from '../db/schema';
import type { PartnerVenue } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPartner } from '../graphql/generated';
import { toGqlAdminPartner } from '../mappers/toGqlPartner';

export async function adminPartnerFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminPartner[]> {
    const rows = await serverRuntime.db.select().from(partners).orderBy(desc(partners.updatedAt));
    if (rows.length === 0) return [];

    const venueRows = await serverRuntime.db
        .select()
        .from(partnerVenues)
        .where(
            inArray(
                partnerVenues.partnerId,
                rows.map((row) => row.partnerId),
            ),
        )
        .orderBy(desc(partnerVenues.updatedAt));

    const venuesByPartnerId = new Map<string, PartnerVenue[]>();
    for (const venue of venueRows) {
        const list = venuesByPartnerId.get(venue.partnerId) ?? [];
        list.push(venue);
        venuesByPartnerId.set(venue.partnerId, list);
    }

    return rows.map((row) => toGqlAdminPartner(row, venuesByPartnerId.get(row.partnerId) ?? []));
}
