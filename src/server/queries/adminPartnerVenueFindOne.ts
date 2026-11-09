import { eq } from 'drizzle-orm';

import { partners, partnerVenues } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPartnerVenue, GqlSAdminPartnerVenueArgs } from '../graphql/generated';
import { toGqlAdminPartner, toGqlAdminPartnerVenue } from '../mappers/toGqlPartner';

export async function adminPartnerVenueFindOne(
    args: GqlSAdminPartnerVenueArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminPartnerVenue | null> {
    const [row] = await serverRuntime.db.select().from(partnerVenues).where(eq(partnerVenues.partnerVenueId, args.partnerVenueId)).limit(1);
    if (!row) return null;
    const [owner] = await serverRuntime.db.select().from(partners).where(eq(partners.partnerId, row.partnerId)).limit(1);
    if (!owner) return null;
    return toGqlAdminPartnerVenue(row, toGqlAdminPartner(owner));
}
