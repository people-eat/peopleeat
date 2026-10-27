import { eq } from 'drizzle-orm';

import { partners } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicPartner, GqlSPublicPartnerQueryFindOneArgs } from '../graphql/generated';
import { toGqlPublicPartner } from '../mappers/toGqlPartner';
import { contentIsPublished } from '../utils/contentPageFind';

export async function publicPartnerFindOne(
    args: GqlSPublicPartnerQueryFindOneArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicPartner | null> {
    const [row] = await serverRuntime.db.select().from(partners).where(eq(partners.partnerId, args.partnerId)).limit(1);
    if (!row || !contentIsPublished(row.publishedAt)) return null;
    return toGqlPublicPartner(row);
}
