import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicPartnerVenue } from '../graphql/generated';
import { toGqlPublicPartnerVenue } from '../mappers/toGqlPartner';
import { publicPublishedPartnerVenuesFindMany } from '../utils/contentPageFind';

export async function publicPartnerVenueFindMany(serverRuntime: ServerRuntime): Promise<GqlSPublicPartnerVenue[]> {
    const rows = await publicPublishedPartnerVenuesFindMany(serverRuntime.db);
    return rows.map(toGqlPublicPartnerVenue);
}
