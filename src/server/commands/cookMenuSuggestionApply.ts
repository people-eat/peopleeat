import { and, eq, isNull } from 'drizzle-orm';

import { DEFAULT_LOCALE } from '../../shared';
import type { Locale } from '../../shared/locale';
import { meals, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMenuSuggestionDraftInput,
    GqlSCookMutation,
    GqlSCookMutationMenuSuggestionApplyArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import type { CookMenuSuggestionDraft } from '../utils/cookMenuSuggestionDraftMaterialize';
import { cookMenuSuggestionDraftMaterialize } from '../utils/cookMenuSuggestionDraftMaterialize';
import { cookMenuSuggestionMenuInsert } from '../utils/cookMenuSuggestionMenuInsert';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

function draftFromInput(input: GqlSCookMenuSuggestionDraftInput): CookMenuSuggestionDraft {
    return {
        title: input.title,
        description: input.description,
        courses: input.courses.map((course) => ({
            title: course.title,
            mealOptions: course.mealOptions.map((meal) => ({
                type: meal.type,
                mealId: meal.mealId ?? null,
                title: meal.title ?? null,
                description: meal.description ?? null,
            })),
        })),
    };
}

/** Persist a reviewed AI menu suggestion as a draft inventory menu. */
export async function cookMenuSuggestionApply(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationMenuSuggestionApplyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, requestingSession, serverRuntime);

    try {
        const enabled = await featureToggleIsEnabled('AI_MENU_CREATE', serverRuntime, cookId);
        if (!enabled) {
            throw new Error('cookMenuSuggestionApply: AI_MENU_CREATE is disabled');
        }

        const cookMeals = await serverRuntime.db
            .select({ mealId: meals.mealId })
            .from(meals)
            .where(and(eq(meals.cookId, cookId), isNull(meals.deletedAt)));
        const existingMealIds = new Set(cookMeals.map((meal) => meal.mealId));

        const [cookUser] = await serverRuntime.db.select({ locale: users.locale }).from(users).where(eq(users.userId, cookId)).limit(1);
        const cookLocale: Locale = cookUser?.locale === 'en' ? 'en' : DEFAULT_LOCALE;
        const generatedAt = new Date();
        const draft = draftFromInput(args.suggestion);

        const menuId = await serverRuntime.db.transaction(async (transaction) => {
            const suggestion = await cookMenuSuggestionDraftMaterialize(cookId, draft, existingMealIds, transaction, generatedAt);
            if (suggestion.courses.length < 1 || suggestion.courses.every((course) => course.mealIds.length === 0)) {
                throw new Error('cookMenuSuggestionApply: generated menu has no usable courses');
            }
            return cookMenuSuggestionMenuInsert(cookId, suggestion, cookLocale, transaction, generatedAt, 'cookMenuSuggestionApply');
        });

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
