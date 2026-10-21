import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import type { MealCreate } from '../db/schema';
import { meals } from '../db/schema';
import type { BookingRequestCookMenuEvaluationGeneratedMealOption } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMenuCourseSuggestion, GqlSCookMenuSuggestion } from '../graphql/generated';

export type CookMenuSuggestionDraft = {
    title: string;
    description: string;
    courses: {
        title: string;
        mealOptions: BookingRequestCookMenuEvaluationGeneratedMealOption[];
    }[];
};

/** Insert NEW_MEAL drafts and resolve meal ids for a structured menu suggestion. */
export async function cookMenuSuggestionDraftMaterialize(
    cookId: string,
    draft: CookMenuSuggestionDraft,
    existingMealIds: ReadonlySet<string>,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMenuSuggestion> {
    const mealInserts: MealCreate[] = [];
    const courses: GqlSCookMenuCourseSuggestion[] = [];

    for (const course of draft.courses) {
        const mealIds: string[] = [];

        for (const meal of course.mealOptions) {
            if (meal.type === 'EXISTING_MEAL' && meal.mealId && existingMealIds.has(meal.mealId)) {
                mealIds.push(meal.mealId);
            } else if (meal.type === 'NEW_MEAL' && meal.title && meal.description) {
                const mealId = idCreate();
                mealInserts.push({
                    mealId,
                    cookId,
                    title: textNormalizeTitled(meal.title),
                    description: textNormalizeProseTitled(meal.description),
                    publishedAt: null,
                    deletedAt: null,
                });
                mealIds.push(mealId);
            }
        }

        courses.push({
            title: textNormalizeTitled(course.title),
            mealIds,
        });
    }

    if (mealInserts.length > 0) {
        await serverRuntime.db.insert(meals).values(mealInserts);
    }

    return {
        title: textNormalizeTitled(draft.title),
        description: textNormalizeProseTitled(draft.description),
        courses,
    };
}
