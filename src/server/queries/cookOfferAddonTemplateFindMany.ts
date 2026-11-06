import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { offerAddonTemplates, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSOfferAddonTemplate, GqlSSession } from '../graphql/generated';
import { toGqlOfferAddonTemplate } from '../mappers/toGqlOfferAddonTemplate';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function cookOfferAddonTemplateFindMany(
    parent: GqlSCook,
    _args: unknown,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSOfferAddonTemplate[]> {
    if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_ADDONS', serverRuntime, parent.cookId))) {
        return [];
    }
    const [user] = await serverRuntime.db.select({ locale: users.locale }).from(users).where(eq(users.userId, parent.cookId)).limit(1);
    const locale = user?.locale === 'en' ? 'en' : 'de';
    const rows = await serverRuntime.db
        .select()
        .from(offerAddonTemplates)
        .where(and(isNotNull(offerAddonTemplates.publishedAt)))
        .orderBy(asc(offerAddonTemplates.position), asc(offerAddonTemplates.createdAt));
    return rows.map((row) => toGqlOfferAddonTemplate(row, locale));
}
