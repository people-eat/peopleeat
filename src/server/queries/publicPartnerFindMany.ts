import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicPartner } from '../graphql/generated';
import { toGqlPublicPartner } from '../mappers/toGqlPartner';
import { publicPublishedPartnersFindMany } from '../utils/contentPageFind';

export async function publicPartnerFindMany(serverRuntime: ServerRuntime): Promise<GqlSPublicPartner[]> {
    const rows = await publicPublishedPartnersFindMany(serverRuntime.db);
    return rows.map(toGqlPublicPartner);
}
