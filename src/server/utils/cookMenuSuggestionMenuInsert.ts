import { cookMenuDraftTitle } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import type { Locale } from '../../shared/locale';
import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import type { MenuCourseCreate, MenuCourseMealOptionCreate, MenuCreate } from '../db/schema';
import { menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMenuSuggestion } from '../graphql/generated';

type SuggestionWriteDb = Pick<ServerRuntime['db'], 'insert'>;

/** Insert a draft inventory menu from a materialized suggestion. Returns menuId. */
export async function cookMenuSuggestionMenuInsert(
    cookId: string,
    suggestion: GqlSCookMenuSuggestion,
    cookLocale: Locale,
    db: SuggestionWriteDb,
    generatedAt: Date | null,
    commandName: string,
): Promise<string> {
    const menuId = idCreate();
    const menuInsert: MenuCreate = {
        menuId,
        cookId,
        title: textNormalizeTitled(suggestion.title) || cookMenuDraftTitle(cookLocale),
        description: textNormalizeProseTitled(suggestion.description),
        publishedAt: null,
        deletedAt: null,
        generatedAt,
    };

    const courseInserts: MenuCourseCreate[] = [];
    const optionInserts: MenuCourseMealOptionCreate[] = [];

    for (const course of suggestion.courses) {
        if (course.mealIds.length === 0) continue;

        const courseId = idCreate();
        courseInserts.push({
            courseId,
            menuId,
            cookId,
            index: courseInserts.length,
            title: textNormalizeTitled(course.title),
            mealSelectionLimit: null,
        });

        for (const [mealIndex, mealId] of course.mealIds.entries()) {
            optionInserts.push({
                mealOptionId: idCreate(),
                courseId,
                cookId,
                mealId,
                index: mealIndex,
            });
        }
    }

    if (courseInserts.length < 1) {
        throw new Error(`${commandName}: generated menu has no usable courses`);
    }

    await db.insert(menus).values(menuInsert);
    await db.insert(menuCourses).values(courseInserts);
    if (optionInserts.length > 0) {
        await db.insert(menuCourseMealOptions).values(optionInserts);
    }

    return menuId;
}
