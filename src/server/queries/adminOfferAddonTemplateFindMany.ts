import { asc } from 'drizzle-orm';

import { offerAddonTemplates } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdmin, GqlSAdminOfferAddonTemplate, GqlSSession } from '../graphql/generated';
import { toGqlAdminOfferAddonTemplate } from '../mappers/toGqlAdminOfferAddonTemplate';

export async function adminOfferAddonTemplateFindMany(
    _parent: GqlSAdmin,
    _args: unknown,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminOfferAddonTemplate[]> {
    const rows = await serverRuntime.db
        .select()
        .from(offerAddonTemplates)
        .orderBy(asc(offerAddonTemplates.position), asc(offerAddonTemplates.createdAt));
    return rows.map(toGqlAdminOfferAddonTemplate);
}
