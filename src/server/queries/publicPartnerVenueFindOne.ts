import { eq } from 'drizzle-orm';

import { partnerVenues } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicPartnerVenue, GqlSPublicPartnerVenueQueryFindOneArgs } from '../graphql/generated';
import { toGqlPublicPartnerVenue } from '../mappers/toGqlPartner';
import { contentIsPublished } from '../utils/contentPageFind';

export async function publicPartnerVenueFindOne(
    args: GqlSPublicPartnerVenueQueryFindOneArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicPartnerVenue | null> {
    const [row] = await serverRuntime.db.select().from(partnerVenues).where(eq(partnerVenues.partnerVenueId, args.partnerVenueId)).limit(1);
    if (!row || !contentIsPublished(row.publishedAt)) return null;
    return toGqlPublicPartnerVenue(row);
}
