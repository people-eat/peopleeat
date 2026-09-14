import { eq } from 'drizzle-orm';

import { partners } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPartner, GqlSAdminPartnerArgs } from '../graphql/generated';
import { toGqlAdminPartner } from '../mappers/toGqlPartner';

export async function adminPartnerFindOne(args: GqlSAdminPartnerArgs, serverRuntime: ServerRuntime): Promise<GqlSAdminPartner | null> {
    const [row] = await serverRuntime.db.select().from(partners).where(eq(partners.partnerId, args.partnerId)).limit(1);
    return row ? toGqlAdminPartner(row) : null;
}
