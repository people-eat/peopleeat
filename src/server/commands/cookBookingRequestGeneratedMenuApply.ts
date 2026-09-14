import { and, eq, isNull } from 'drizzle-orm';

import { capitalizeFirstLetter, cookMenuDraftTitle, DEFAULT_LOCALE } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import type { Locale } from '../../shared/locale';
import type { MenuCourseCreate, MenuCourseMealOptionCreate, MenuCreate } from '../db/schema';
import { bookingRequestCooks, meals, menuCourseMealOptions, menuCourses, menus, users } from '../db/schema';
import type { BookingRequestCookMenuEvaluation } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestGeneratedMenuApplyArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookMenuSuggestionDraftMaterialize } from '../utils/cookMenuSuggestionDraftMaterialize';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

function appliedRecommendationEvaluationSummary(locale: Locale): string {
    return {
        de: 'Von der Plattform für diese Anfrage empfohlen.',
        en: 'Recommended by the platform for this request.',
    }[locale];
}

/** Materialize the stored AI-generated menu recommendation into a draft inventory menu. */
export async function cookBookingRequestGeneratedMenuApply(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestGeneratedMenuApplyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const enabled = await featureToggleIsEnabled('AI_MENU_EVALUATION', serverRuntime, cookId);
        if (!enabled) {
            throw new Error('cookBookingRequestGeneratedMenuApply: AI_MENU_EVALUATION is disabled');
        }

        const [details] = await serverRuntime.db
            .select({ menuEvaluation: bookingRequestCooks.menuEvaluation })
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, args.bookingRequestId)))
            .limit(1);

        const evaluation = details?.menuEvaluation;
        const generatedMenu = evaluation?.generatedMenu;
        if (evaluation == null || generatedMenu == null) {
            throw new Error('cookBookingRequestGeneratedMenuApply: no generated menu recommendation');
        }

        const cookMeals = await serverRuntime.db
            .select({ mealId: meals.mealId })
            .from(meals)
            .where(and(eq(meals.cookId, cookId), isNull(meals.deletedAt)));
        const existingMealIds = new Set(cookMeals.map((meal) => meal.mealId));

        const suggestion = await cookMenuSuggestionDraftMaterialize(cookId, generatedMenu, existingMealIds, serverRuntime);

        if (suggestion.courses.length < 1 || suggestion.courses.every((course) => course.mealIds.length === 0)) {
            throw new Error('cookBookingRequestGeneratedMenuApply: generated menu has no usable courses');
        }

        const [cookUser] = await serverRuntime.db.select({ locale: users.locale }).from(users).where(eq(users.userId, cookId)).limit(1);
        const cookLocale: Locale = cookUser?.locale === 'en' ? 'en' : DEFAULT_LOCALE;

        const menuId = idCreate();
        const menuInsert: MenuCreate = {
            menuId,
            cookId,
            title: capitalizeFirstLetter(suggestion.title.trim()) || cookMenuDraftTitle(cookLocale),
            description: suggestion.description,
            publishedAt: null,
            deletedAt: null,
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
                title: course.title,
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
            throw new Error('cookBookingRequestGeneratedMenuApply: generated menu has no usable courses');
        }

        // Drop the draft and banner; mark the new menu suitable so it gets a Passend badge immediately.
        const menuEvaluationAfterApply: BookingRequestCookMenuEvaluation = {
            ...evaluation,
            evaluationSummary: '',
            generatedMenu: null,
            menus: [
                {
                    menuId,
                    isSuitable: true,
                    evaluationSummary: appliedRecommendationEvaluationSummary(cookLocale),
                },
                ...evaluation.menus.filter((menu) => menu.menuId !== menuId),
            ],
        };

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(menus).values(menuInsert);
            await transaction.insert(menuCourses).values(courseInserts);
            if (optionInserts.length > 0) {
                await transaction.insert(menuCourseMealOptions).values(optionInserts);
            }
            await transaction
                .update(bookingRequestCooks)
                .set({ menuEvaluation: menuEvaluationAfterApply })
                .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, args.bookingRequestId)));
        });

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
