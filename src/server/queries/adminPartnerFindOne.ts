import { desc, eq } from 'drizzle-orm';

import { partners, partnerVenues } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPartner, GqlSAdminPartnerArgs } from '../graphql/generated';
import { toGqlAdminPartner } from '../mappers/toGqlPartner';

export async function adminPartnerFindOne(args: GqlSAdminPartnerArgs, serverRuntime: ServerRuntime): Promise<GqlSAdminPartner | null> {
    const [row] = await serverRuntime.db.select().from(partners).where(eq(partners.partnerId, args.partnerId)).limit(1);
    if (!row) return null;
    const venues = await serverRuntime.db
        .select()
        .from(partnerVenues)
        .where(eq(partnerVenues.partnerId, row.partnerId))
        .orderBy(desc(partnerVenues.updatedAt));
    return toGqlAdminPartner(row, venues);
}
