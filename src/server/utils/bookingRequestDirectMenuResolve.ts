import { and, eq } from 'drizzle-orm';

import { cookMenuIsPublicCatalogEligible } from '../../shared/cookMenuCompleteness';
import { menus } from '../db/schema';
import type { BookingRequestCookRequestedMenu } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestRequestedMenuFromPublicCookMenu } from './bookingRequestRequestedMenuFromPublicCookMenu';
import { publicCookMenusWithCourses } from './cookMenuHydrate';
import { publicCookMenuCatalogWhere } from './publicCookMenuCatalogWhere';

/**
 * Honors a chef-page `requestedMenuId` only when it is this cook's published,
 * complete inventory menu with at least one meal image. Otherwise null.
 */
export async function bookingRequestDirectMenuResolve(
    serverRuntime: ServerRuntime,
    input: { cookId: string; requestedMenuId: string | null | undefined },
): Promise<BookingRequestCookRequestedMenu | null> {
    const requestedMenuId = input.requestedMenuId?.trim() || null;
    if (!requestedMenuId) {
        return null;
    }

    const now = new Date();
    const [row] = await serverRuntime.db
        .select()
        .from(menus)
        .where(and(eq(menus.menuId, requestedMenuId), eq(menus.cookId, input.cookId), publicCookMenuCatalogWhere(now)))
        .limit(1);

    if (!row) {
        return null;
    }

    const [hydrated] = await publicCookMenusWithCourses(serverRuntime.db, [row]);
    if (
        hydrated == null ||
        !cookMenuIsPublicCatalogEligible({
            courses: hydrated.courses.map((course) => ({ title: course.title, mealOptionCount: course.mealOptions.length })),
            courseMealOptionImages: hydrated.courseMealOptionImages,
        })
    ) {
        return null;
    }

    return bookingRequestRequestedMenuFromPublicCookMenu(hydrated);
}
