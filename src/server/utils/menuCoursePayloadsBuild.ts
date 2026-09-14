import { capitalizeFirstLetter } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import type { MenuCourseCreate, MenuCourseMealOptionCreate } from '../db/schema';
import type { GqlSCookMenuCourseInput } from '../graphql/generated';
import { menuMealSelectionLimitNormalize } from './menuMealSelectionLimit';

/** Build full-replace course + option inserts for a menu update. */
export function menuCoursePayloadsBuild(
    cookId: string,
    menuId: string,
    courses: GqlSCookMenuCourseInput[],
    commandName: string,
): { courseInserts: MenuCourseCreate[]; optionInserts: MenuCourseMealOptionCreate[] } {
    if (courses.length < 1) {
        throw new Error(`${commandName}: menus need at least one course`);
    }

    const courseInserts: MenuCourseCreate[] = [];
    const optionInserts: MenuCourseMealOptionCreate[] = [];

    for (let courseIndex = 0; courseIndex < courses.length; courseIndex += 1) {
        const course = courses[courseIndex]!;
        const title = course.title.trim();
        if (title.length === 0) {
            throw new Error(`${commandName}: each course needs a title`);
        }

        const courseId = idCreate();
        courseInserts.push({
            courseId,
            menuId,
            cookId,
            index: courseIndex,
            title: capitalizeFirstLetter(title),
            mealSelectionLimit: menuMealSelectionLimitNormalize(course.mealSelectionLimit, course.mealIds.length),
        });

        for (let mealIndex = 0; mealIndex < course.mealIds.length; mealIndex += 1) {
            optionInserts.push({
                mealOptionId: idCreate(),
                courseId,
                cookId,
                mealId: course.mealIds[mealIndex]!,
                index: mealIndex,
            });
        }
    }

    return { courseInserts, optionInserts };
}
