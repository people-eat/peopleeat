import { and, eq, inArray, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import type { MenuCourseCreate, MenuCourseMealOptionCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

type DbExecutor = Pick<ServerRuntime['db'], 'select' | 'insert'>;

export type MenuDeepCopyInsertInput = {
    cookId: string;
    sourceMenuId: string;
    /** When set, the copy is offer-scoped (listed under Cook.offerMenus). */
    bookingRequestOfferId?: string;
};

/**
 * Deep-copies a cook inventory menu (courses + meal options) into a new row.
 * Caller owns the transaction / publish. Source must be inventory (`bookingRequestOfferId` null).
 */
export async function menuDeepCopyInsert(db: DbExecutor, input: MenuDeepCopyInsertInput): Promise<string> {
    const { cookId, sourceMenuId, bookingRequestOfferId } = input;

    const [menu] = await db
        .select()
        .from(menus)
        .where(and(eq(menus.menuId, sourceMenuId), eq(menus.cookId, cookId), isNull(menus.deletedAt), isNull(menus.bookingRequestOfferId)))
        .limit(1);

    if (!menu) {
        throw new Error('menuDeepCopyInsert: menu not found');
    }

    const courses = await db
        .select()
        .from(menuCourses)
        .where(and(eq(menuCourses.menuId, sourceMenuId), eq(menuCourses.cookId, cookId)));

    const courseIds = courses.map((course) => course.courseId);
    const options =
        courseIds.length === 0
            ? []
            : await db
                  .select()
                  .from(menuCourseMealOptions)
                  .where(and(eq(menuCourseMealOptions.cookId, cookId), inArray(menuCourseMealOptions.courseId, courseIds)));

    const newMenuId = idCreate();
    const courseIdByOld = new Map<string, string>();
    const courseInserts: MenuCourseCreate[] = courses.map((course) => {
        const courseId = idCreate();
        courseIdByOld.set(course.courseId, courseId);
        return {
            courseId,
            menuId: newMenuId,
            cookId,
            index: course.index,
            title: course.title,
            mealSelectionLimit: course.mealSelectionLimit,
        };
    });
    const optionInserts: MenuCourseMealOptionCreate[] = options.map((option) => ({
        mealOptionId: idCreate(),
        courseId: courseIdByOld.get(option.courseId)!,
        cookId,
        mealId: option.mealId,
        index: option.index,
    }));

    await db.insert(menus).values({
        menuId: newMenuId,
        cookId,
        bookingRequestOfferId: bookingRequestOfferId ?? null,
        copyOfMenuId: sourceMenuId,
        title: menu.title,
        description: menu.description,
        publishedAt: bookingRequestOfferId ? menu.publishedAt : null,
        deletedAt: null,
    });
    if (courseInserts.length > 0) {
        await db.insert(menuCourses).values(courseInserts);
    }
    if (optionInserts.length > 0) {
        await db.insert(menuCourseMealOptions).values(optionInserts);
    }

    return newMenuId;
}
