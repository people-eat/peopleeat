import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import type { Database } from '../db';
import { meals, menuCourseMealOptions, menuCourses } from '../db/schema';
import type { Menu } from '../db/schema';
import type {
    GqlSCookMenu,
    GqlSCookMenuCourse,
    GqlSPublicCookMeal,
    GqlSPublicCookMenu,
    GqlSPublicCookMenuCourse,
} from '../graphql/generated';
import { toGqlCookMeal } from '../mappers/toGqlCookMeal';
import { toGqlPublicCookMeal } from '../mappers/toGqlPublicCookMeal';

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

type MenuCourseHydration = {
    courses: Array<{
        courseId: string;
        menuId: string;
        title: string;
        mealSelectionLimit: number | null;
        mealOptions: Array<{ mealId: string }>;
    }>;
    mealsById: Map<string, ReturnType<typeof toGqlCookMeal>>;
    publicMealsById: Map<string, GqlSPublicCookMeal>;
};

async function menuCoursesHydrate(db: Database, rows: Menu[]): Promise<MenuCourseHydration> {
    if (rows.length === 0) {
        return { courses: [], mealsById: new Map(), publicMealsById: new Map() };
    }

    const menuIds = rows.map((row) => row.menuId);
    const courses = await db.select().from(menuCourses).where(inArray(menuCourses.menuId, menuIds)).orderBy(asc(menuCourses.index));

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

    const mealsById = new Map(mealRows.map((meal) => [meal.mealId, toGqlCookMeal(meal)]));
    const publicMealsById = new Map(mealRows.map((meal) => [meal.mealId, toGqlPublicCookMeal(meal)]));
    const optionsByCourseId = new Map<string, typeof options>();
    for (const option of options) {
        const list = optionsByCourseId.get(option.courseId) ?? [];
        list.push(option);
        optionsByCourseId.set(option.courseId, list);
    }

    return {
        courses: courses.map((course) => ({
            courseId: course.courseId,
            menuId: course.menuId,
            title: course.title,
            mealSelectionLimit: course.mealSelectionLimit,
            mealOptions: optionsByCourseId.get(course.courseId) ?? [],
        })),
        mealsById,
        publicMealsById,
    };
}

/** Load courses + active meal options for a set of menu rows (cook GraphQL). */
export async function cookMenusWithCourses(db: Database, rows: Menu[]): Promise<GqlSCookMenu[]> {
    if (rows.length === 0) return [];

    const { courses, mealsById } = await menuCoursesHydrate(db, rows);
    const coursesByMenuId = new Map<string, GqlSCookMenuCourse[]>();
    for (const course of courses) {
        const mealOptions = course.mealOptions
            .map((option) => mealsById.get(option.mealId))
            .filter((meal): meal is NonNullable<typeof meal> => meal != null);

        const gqlCourse: GqlSCookMenuCourse = {
            courseId: course.courseId,
            title: course.title,
            mealSelectionLimit: course.mealSelectionLimit,
            mealOptions,
        };
        const list = coursesByMenuId.get(course.menuId) ?? [];
        list.push(gqlCourse);
        coursesByMenuId.set(course.menuId, list);
    }

    return rows.map((row) => {
        const hydratedCourses = coursesByMenuId.get(row.menuId) ?? [];
        return {
            menuId: row.menuId,
            title: row.title,
            description: row.description,
            publishedAt: row.publishedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            copyOfMenuId: row.copyOfMenuId ?? null,
            bookingRequestOfferId: row.bookingRequestOfferId ?? null,
            offerContext: null,
            // Field resolver loads the living inventory template when requested.
            templateMenu: null,
            courses: hydratedCourses,
            courseMealOptionImages: courseMealOptionImagesFromCourses(hydratedCourses),
        };
    });
}

/** Public menu copies for customer booking-request offers. */
export async function publicCookMenusWithCourses(db: Database, rows: Menu[]): Promise<GqlSPublicCookMenu[]> {
    if (rows.length === 0) return [];

    const { courses, publicMealsById } = await menuCoursesHydrate(db, rows);
    const coursesByMenuId = new Map<string, GqlSPublicCookMenuCourse[]>();
    for (const course of courses) {
        const mealOptions = course.mealOptions
            .map((option) => publicMealsById.get(option.mealId))
            .filter((meal): meal is NonNullable<typeof meal> => meal != null);

        const gqlCourse: GqlSPublicCookMenuCourse = {
            courseId: course.courseId,
            title: course.title,
            mealSelectionLimit: course.mealSelectionLimit,
            mealOptions,
        };
        const list = coursesByMenuId.get(course.menuId) ?? [];
        list.push(gqlCourse);
        coursesByMenuId.set(course.menuId, list);
    }

    return rows.map((row) => {
        const hydratedCourses = coursesByMenuId.get(row.menuId) ?? [];
        return {
            menuId: row.menuId,
            title: row.title,
            description: row.description,
            publishedAt: row.publishedAt,
            courses: hydratedCourses,
            courseMealOptionImages: courseMealOptionImagesFromCourses(hydratedCourses),
        };
    });
}

export async function cookMenuWithCourses(db: Database, row: Menu): Promise<GqlSCookMenu> {
    const [menu] = await cookMenusWithCourses(db, [row]);
    return menu!;
}

/** Assert every mealId belongs to the cook and is not soft-deleted. */
export async function cookMenuMealIdsAssertOwned(db: Database, cookId: string, mealIds: string[], commandName: string): Promise<void> {
    const unique = [...new Set(mealIds)];
    if (unique.length === 0) return;

    const rows = await db
        .select({ mealId: meals.mealId })
        .from(meals)
        .where(and(eq(meals.cookId, cookId), inArray(meals.mealId, unique), isNull(meals.deletedAt)));

    if (rows.length !== unique.length) {
        throw new Error(`${commandName}: one or more meals are missing or deleted`);
    }
}
