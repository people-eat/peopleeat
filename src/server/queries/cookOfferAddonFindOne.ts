import { and, eq, isNull } from 'drizzle-orm';

import { cookOfferAddons } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookOfferAddon, GqlSCookOfferAddonArgs, GqlSSession } from '../graphql/generated';
import { toGqlCookOfferAddon } from '../mappers/toGqlCookOfferAddon';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function cookOfferAddonFindOne(
    parent: GqlSCook,
    { cookOfferAddonId }: GqlSCookOfferAddonArgs,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookOfferAddon | null> {
    if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_ADDONS', serverRuntime, parent.cookId))) {
        return null;
    }
    const [row] = await serverRuntime.db
        .select()
        .from(cookOfferAddons)
        .where(
            and(
                eq(cookOfferAddons.cookOfferAddonId, cookOfferAddonId),
                eq(cookOfferAddons.cookId, parent.cookId),
                isNull(cookOfferAddons.deletedAt),
            ),
        )
        .limit(1);
    return row ? toGqlCookOfferAddon(row) : null;
}
