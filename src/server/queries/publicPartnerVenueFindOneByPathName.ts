import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicPartnerVenue, GqlSPublicPartnerVenueQueryFindOneByPathNameArgs } from '../graphql/generated';
import { toGqlPublicPartnerVenue } from '../mappers/toGqlPartner';
import { contentIsPublished, partnerVenueFindByPathNameAny } from '../utils/contentPageFind';

export async function publicPartnerVenueFindOneByPathName(
    args: GqlSPublicPartnerVenueQueryFindOneByPathNameArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicPartnerVenue | null> {
    const row = await partnerVenueFindByPathNameAny(serverRuntime.db, args.pathName);
    if (!row || !contentIsPublished(row.publishedAt)) return null;
    return toGqlPublicPartnerVenue(row);
}
