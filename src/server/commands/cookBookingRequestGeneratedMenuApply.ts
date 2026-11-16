import { and, eq, isNull } from 'drizzle-orm';

import { DEFAULT_LOCALE, inlineCopy } from '../../shared';
import type { Locale } from '../../shared/locale';
import { bookingRequestCooks, meals, users } from '../db/schema';
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
import { cookMenuSuggestionMenuInsert } from '../utils/cookMenuSuggestionMenuInsert';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

function appliedRecommendationEvaluationSummary(locale: Locale): string {
    return inlineCopy(
        {
            de: 'Von der Plattform für diese Anfrage empfohlen.',
            en: 'Recommended by the platform for this request.',
        },
        locale,
    );
}

/** Materialize the stored AI-generated menu recommendation into a draft inventory menu. */
export async function cookBookingRequestGeneratedMenuApply(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestGeneratedMenuApplyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, requestingSession, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestGeneratedMenuApply');

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

        const [cookUser] = await serverRuntime.db.select({ locale: users.locale }).from(users).where(eq(users.userId, cookId)).limit(1);
        const cookLocale: Locale = cookUser?.locale === 'en' ? 'en' : DEFAULT_LOCALE;
        const generatedAt = new Date();

        const menuId = await serverRuntime.db.transaction(async (transaction) => {
            const suggestion = await cookMenuSuggestionDraftMaterialize(cookId, generatedMenu, existingMealIds, transaction, generatedAt);

            if (suggestion.courses.length < 1 || suggestion.courses.every((course) => course.mealIds.length === 0)) {
                throw new Error('cookBookingRequestGeneratedMenuApply: generated menu has no usable courses');
            }

            const createdMenuId = await cookMenuSuggestionMenuInsert(
                cookId,
                suggestion,
                cookLocale,
                transaction,
                generatedAt,
                'cookBookingRequestGeneratedMenuApply',
            );

            const menuEvaluationAfterApply: BookingRequestCookMenuEvaluation = {
                ...evaluation,
                evaluationSummary: '',
                generatedMenu: null,
                menus: [
                    {
                        menuId: createdMenuId,
                        isSuitable: true,
                        evaluationSummary: appliedRecommendationEvaluationSummary(cookLocale),
                    },
                    ...evaluation.menus.filter((menu) => menu.menuId !== createdMenuId),
                ],
            };

            await transaction
                .update(bookingRequestCooks)
                .set({ menuEvaluation: menuEvaluationAfterApply })
                .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, args.bookingRequestId)));

            return createdMenuId;
        });

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
