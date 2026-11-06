import { eq } from 'drizzle-orm';

import { offerAddonTemplates } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdmin, GqlSAdminOfferAddonTemplate, GqlSAdminOfferAddonTemplateArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminOfferAddonTemplate } from '../mappers/toGqlAdminOfferAddonTemplate';

export async function adminOfferAddonTemplateFindOne(
    _parent: GqlSAdmin,
    { offerAddonTemplateId }: GqlSAdminOfferAddonTemplateArgs,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminOfferAddonTemplate | null> {
    const [row] = await serverRuntime.db
        .select()
        .from(offerAddonTemplates)
        .where(eq(offerAddonTemplates.offerAddonTemplateId, offerAddonTemplateId))
        .limit(1);
    return row ? toGqlAdminOfferAddonTemplate(row) : null;
}
