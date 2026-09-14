import { and, eq, isNull } from 'drizzle-orm';

import { menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookMenu, GqlSCookMenuArgs, GqlSSession } from '../graphql/generated';
import { cookMenuWithCourses } from '../utils/cookMenuHydrate';
import { cookMenuOfferContextsLoad } from '../utils/cookMenuOfferContextsLoad';

/** Library or offer-scoped menu owned by the cook (non-deleted). */
export async function cookMenuFindOne(
    { cookId }: GqlSCook,
    args: GqlSCookMenuArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMenu | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(menus)
            .where(and(eq(menus.menuId, args.menuId), eq(menus.cookId, cookId), isNull(menus.deletedAt)))
            .limit(1);

        if (!row) return null;

        const menu = await cookMenuWithCourses(serverRuntime.db, row);
        if (row.bookingRequestOfferId == null) return menu;

        const contexts = await cookMenuOfferContextsLoad(serverRuntime.db, [row.bookingRequestOfferId]);
        return {
            ...menu,
            offerContext: contexts.get(row.bookingRequestOfferId) ?? null,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
