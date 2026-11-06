import { and, asc, eq, isNull } from 'drizzle-orm';

import { cookOfferAddons } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookOfferAddon, GqlSSession } from '../graphql/generated';
import { toGqlCookOfferAddon } from '../mappers/toGqlCookOfferAddon';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function cookOfferAddonFindMany(
    parent: GqlSCook,
    _args: unknown,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookOfferAddon[]> {
    if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_ADDONS', serverRuntime, parent.cookId))) {
        return [];
    }
    const rows = await serverRuntime.db
        .select()
        .from(cookOfferAddons)
        .where(
            and(
                eq(cookOfferAddons.cookId, parent.cookId),
                isNull(cookOfferAddons.bookingRequestOfferId),
                isNull(cookOfferAddons.deletedAt),
            ),
        )
        .orderBy(asc(cookOfferAddons.createdAt));
    return rows.map(toGqlCookOfferAddon);
}
