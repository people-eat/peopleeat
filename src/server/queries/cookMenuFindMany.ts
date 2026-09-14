import { and, desc, eq, isNull } from 'drizzle-orm';

import { menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookMenu, GqlSSession } from '../graphql/generated';
import { cookMenusWithCourses } from '../utils/cookMenuHydrate';

export async function cookMenuFindMany(
    { cookId }: GqlSCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMenu[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(menus)
            .where(and(eq(menus.cookId, cookId), isNull(menus.deletedAt), isNull(menus.bookingRequestOfferId)))
            .orderBy(desc(menus.createdAt));

        return cookMenusWithCourses(serverRuntime.db, rows);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
