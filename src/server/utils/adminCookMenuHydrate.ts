import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import type { Database } from '../db';
import type { Menu } from '../db/schema';
import { meals, menuCourseMealOptions, menuCourses, users } from '../db/schema';
import type { GqlSAdminCookMenu, GqlSAdminCookMenuCourse } from '../graphql/generated';
import { toGqlAdminCookMeal } from '../mappers/toGqlAdminCookMeal';
import { toGqlAdminCookMenu } from '../mappers/toGqlAdminCookMenu';

/** Public image URLs from meal options, course/option order, first-occurrence dedupe. */
function courseMealOptionImagesFromCourses(courses: ReadonlyArray<{ mealOptions: ReadonlyArray<{ imageUrl?: string | null }> }>): string[] {
    const seen = new Set<string>();
    const images: string[] = [];
    for (const course of courses) {
        for (const meal of course.mealOptions) {
            const url = meal.imageUrl;
            if (url == null || url.length === 0 || seen.has(url)) continue;
            seen.add(url);
            images.push(url);
        }
    }
    return images;
}

/** Load courses + active meal options for an admin inventory menu row. */
export async function adminCookMenuWithCourses(db: Database, row: Menu, cookName: string): Promise<GqlSAdminCookMenu> {
    const courses = await db.select().from(menuCourses).where(eq(menuCourses.menuId, row.menuId)).orderBy(asc(menuCourses.index));

    const courseIds = courses.map((course) => course.courseId);
    const options =
        courseIds.length === 0
            ? []
            : await db
                  .select()
                  .from(menuCourseMealOptions)
                  .where(inArray(menuCourseMealOptions.courseId, courseIds))
                  .orderBy(asc(menuCourseMealOptions.index));

    const mealIds = [...new Set(options.map((option) => option.mealId))];
    const mealRows =
        mealIds.length === 0
            ? []
            : await db
                  .select()
                  .from(meals)
                  .where(and(inArray(meals.mealId, mealIds), isNull(meals.deletedAt)));

    const cookIds = [...new Set(mealRows.map((meal) => meal.cookId))];
    const cookNameRows =
        cookIds.length === 0
            ? []
            : await db
                  .select({ userId: users.userId, firstName: users.firstName, lastName: users.lastName })
                  .from(users)
                  .where(inArray(users.userId, cookIds));
    const cookNameById = new Map(cookNameRows.map((u) => [u.userId, `${u.firstName} ${u.lastName}`.trim()]));

    const mealsById = new Map(mealRows.map((meal) => [meal.mealId, toGqlAdminCookMeal(meal, cookNameById.get(meal.cookId) ?? cookName)]));

    const optionsByCourseId = new Map<string, typeof options>();
    for (const option of options) {
        const list = optionsByCourseId.get(option.courseId) ?? [];
        list.push(option);
        optionsByCourseId.set(option.courseId, list);
    }

    const hydratedCourses: GqlSAdminCookMenuCourse[] = courses.map((course) => ({
        courseId: course.courseId,
        title: course.title,
        mealSelectionLimit: course.mealSelectionLimit,
        mealOptions: (optionsByCourseId.get(course.courseId) ?? [])
            .map((option) => mealsById.get(option.mealId))
            .filter((meal): meal is NonNullable<typeof meal> => meal != null),
    }));

    return toGqlAdminCookMenu(row, cookName, hydratedCourses.length, courseMealOptionImagesFromCourses(hydratedCourses), hydratedCourses);
}
