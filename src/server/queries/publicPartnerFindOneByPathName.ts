import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicPartner, GqlSPublicPartnerQueryFindOneByPathNameArgs } from '../graphql/generated';
import { toGqlPublicPartner } from '../mappers/toGqlPartner';
import { contentIsPublished, partnerFindByPathNameAny } from '../utils/contentPageFind';

export async function publicPartnerFindOneByPathName(
    args: GqlSPublicPartnerQueryFindOneByPathNameArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicPartner | null> {
    const row = await partnerFindByPathNameAny(serverRuntime.db, args.pathName);
    if (!row || !contentIsPublished(row.publishedAt)) return null;
    return toGqlPublicPartner(row);
}
