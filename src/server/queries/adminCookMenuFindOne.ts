import { eq } from 'drizzle-orm';

import { menus, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookMenu, GqlSAdminCookMenuArgs, GqlSSession } from '../graphql/generated';
import { adminCookMenuWithCourses } from '../utils/adminCookMenuHydrate';

/**
 * Single cook menu for admin (including soft-deleted). Inventory and offer-scoped
 * copies both resolve so offer pages can deep-link; list queries stay inventory-only.
 */
export async function adminCookMenuFindOne(
    args: GqlSAdminCookMenuArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCookMenu | null> {
    try {
        const [row] = await serverRuntime.db
            .select({
                menu: menus,
                cookFirstName: users.firstName,
                cookLastName: users.lastName,
            })
            .from(menus)
            .innerJoin(users, eq(users.userId, menus.cookId))
            .where(eq(menus.menuId, args.menuId))
            .limit(1);

        if (!row) return null;

        return adminCookMenuWithCourses(serverRuntime.db, row.menu, `${row.cookFirstName} ${row.cookLastName}`.trim());
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
