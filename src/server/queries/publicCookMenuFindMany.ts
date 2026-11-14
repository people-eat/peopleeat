import { and, desc, eq } from 'drizzle-orm';

import { cookMenuIsPublicCatalogEligible } from '../../shared/cookMenuCompleteness';
import { menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCook, GqlSPublicCookMenu } from '../graphql/generated';
import { publicCookMenusWithCourses } from '../utils/cookMenuHydrate';
import { publicCookMenuCatalogWhere } from '../utils/publicCookMenuCatalogWhere';

function publicCookMenuIsCatalogEligible(menu: GqlSPublicCookMenu): boolean {
    return cookMenuIsPublicCatalogEligible({
        courses: menu.courses.map((course) => ({ title: course.title, mealOptionCount: course.mealOptions.length })),
        courseMealOptionImages: menu.courseMealOptionImages,
    });
}

/** Published, complete inventory menus with at least one meal image for a public cook profile. */
export async function publicCookMenuFindMany(
    { cookId }: Pick<GqlSPublicCook, 'cookId'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicCookMenu[]> {
    const now = new Date();
    const rows = await serverRuntime.db
        .select()
        .from(menus)
        .where(and(eq(menus.cookId, cookId), publicCookMenuCatalogWhere(now)))
        .orderBy(desc(menus.publishedAt));

    const hydrated = await publicCookMenusWithCourses(serverRuntime.db, rows);
    return hydrated.filter(publicCookMenuIsCatalogEligible);
}
