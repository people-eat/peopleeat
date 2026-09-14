import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import { menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookMenu, GqlSSession } from '../graphql/generated';
import { cookMenusWithCourses } from '../utils/cookMenuHydrate';
import { cookMenuOfferContextsLoad } from '../utils/cookMenuOfferContextsLoad';

/** Non-deleted offer-scoped menu copies for the cook, newest first. */
export async function cookOfferMenuFindMany(
    { cookId }: GqlSCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMenu[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(menus)
            .where(and(eq(menus.cookId, cookId), isNull(menus.deletedAt), isNotNull(menus.bookingRequestOfferId)))
            .orderBy(desc(menus.createdAt));

        const hydrated = await cookMenusWithCourses(serverRuntime.db, rows);
        const offerIds = rows.map((row) => row.bookingRequestOfferId).filter((id): id is string => id != null);
        const contexts = await cookMenuOfferContextsLoad(serverRuntime.db, offerIds);

        return hydrated.map((menu) => ({
            ...menu,
            offerContext: menu.bookingRequestOfferId != null ? (contexts.get(menu.bookingRequestOfferId) ?? null) : null,
        }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
