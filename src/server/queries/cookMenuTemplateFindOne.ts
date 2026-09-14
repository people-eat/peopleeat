import { and, eq, isNull } from 'drizzle-orm';

import { menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMenu, GqlSSession } from '../graphql/generated';
import { cookMenuWithCourses } from '../utils/cookMenuHydrate';

/** Living inventory template for an offer-scoped menu (`copyOfMenuId`), or null. */
export async function cookMenuTemplateFindOne(
    cookId: string,
    templateMenuId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMenu | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(menus)
            .where(
                and(
                    eq(menus.menuId, templateMenuId),
                    eq(menus.cookId, cookId),
                    isNull(menus.deletedAt),
                    isNull(menus.bookingRequestOfferId),
                ),
            )
            .limit(1);

        return row ? cookMenuWithCourses(serverRuntime.db, row) : null;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
