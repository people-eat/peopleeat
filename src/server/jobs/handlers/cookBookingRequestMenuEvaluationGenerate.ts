import { and, eq, inArray, isNull } from 'drizzle-orm';

import { cookBookingRequestMenuEvaluationGenerate } from '../../commands/cookBookingRequestMenuEvaluationGenerate';
import { cookMenuSuggestionFromInventoryGenerate } from '../../commands/cookMenuSuggestionFromInventoryGenerate';
import {
    bookingRequestCooks,
    bookingRequestParticipants,
    bookingRequests,
    meals,
    menuCourseMealOptions,
    menuCourses,
    menus,
} from '../../db/schema';
import type { BookingRequestCookMenuEvaluation } from '../../domain/bookingRequest';
import type { ServerRuntime } from '../../domain/ServerRuntime';
import { bookingRequestCookMenuEvaluationContextBuild } from '../../utils/bookingRequestCookMenuEvaluationContext';
import type { QueuedJobDefinition } from '../types';

interface CookBookingRequestMenuEvaluationGenerateData {
    cookId: string;
    bookingRequestId: string;
}

async function clearLoading(cookId: string, bookingRequestId: string, serverRuntime: ServerRuntime): Promise<void> {
    await serverRuntime.db
        .update(bookingRequestCooks)
        .set({ menuEvaluationLoading: false })
        .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
    await serverRuntime.publish.userUpdates({ userId: cookId });
}

export const cookBookingRequestMenuEvaluationGenerateJob: QueuedJobDefinition<CookBookingRequestMenuEvaluationGenerateData> = {
    kind: 'queued',
    name: 'cook-booking-request-menu-evaluation-generate',
    handler: async ({ data, serverRuntime }) => {
        const { cookId, bookingRequestId } = data;

        try {
            const [[bookingRequest], participants, menuRows] = await Promise.all([
                serverRuntime.db.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId)).limit(1),
                serverRuntime.db
                    .select()
                    .from(bookingRequestParticipants)
                    .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequestId)),
                serverRuntime.db
                    .select()
                    .from(menus)
                    .where(and(eq(menus.cookId, cookId), isNull(menus.deletedAt), isNull(menus.bookingRequestOfferId))),
            ]);

            if (!bookingRequest) {
                serverRuntime.log.warn(`cookBookingRequestMenuEvaluationGenerate: booking request ${bookingRequestId} not found`);
                await clearLoading(cookId, bookingRequestId, serverRuntime);
                return;
            }

            const menuIds = menuRows.map((menu) => menu.menuId);
            const coursesForMenus =
                menuIds.length === 0 ? [] : await serverRuntime.db.select().from(menuCourses).where(inArray(menuCourses.menuId, menuIds));

            const courseIds = coursesForMenus.map((course) => course.courseId);
            const optionsForCourses =
                courseIds.length === 0
                    ? []
                    : await serverRuntime.db.select().from(menuCourseMealOptions).where(inArray(menuCourseMealOptions.courseId, courseIds));

            const mealIds = [...new Set(optionsForCourses.map((option) => option.mealId))];
            const mealRows =
                mealIds.length === 0
                    ? []
                    : await serverRuntime.db
                          .select({
                              mealId: meals.mealId,
                              title: meals.title,
                              description: meals.description,
                          })
                          .from(meals)
                          .where(and(inArray(meals.mealId, mealIds), isNull(meals.deletedAt)));
            const mealsById = new Map(mealRows.map((meal) => [meal.mealId, meal]));

            const optionsByCourseId = new Map<string, typeof optionsForCourses>();
            for (const option of optionsForCourses) {
                const list = optionsByCourseId.get(option.courseId) ?? [];
                list.push(option);
                optionsByCourseId.set(option.courseId, list);
            }

            const coursesByMenuId = new Map<string, typeof coursesForMenus>();
            for (const course of coursesForMenus) {
                const list = coursesByMenuId.get(course.menuId) ?? [];
                list.push(course);
                coursesByMenuId.set(course.menuId, list);
            }

            const evaluationMenus = menuRows.map((menu) => ({
                menuId: menu.menuId,
                title: menu.title,
                description: menu.description,
                courses: (coursesByMenuId.get(menu.menuId) ?? [])
                    .slice()
                    .sort((a, b) => a.index - b.index)
                    .map((course) => ({
                        title: course.title,
                        mealOptions: (optionsByCourseId.get(course.courseId) ?? [])
                            .slice()
                            .sort((a, b) => a.index - b.index)
                            .flatMap((option) => {
                                const meal = mealsById.get(option.mealId);
                                if (!meal) return [];
                                return [{ title: meal.title, description: meal.description }];
                            }),
                    })),
            }));

            const bookingRequestContext = bookingRequestCookMenuEvaluationContextBuild({
                bookingRequest,
                participants,
            });

            const [ranking, generatedDraft] = await Promise.all([
                cookBookingRequestMenuEvaluationGenerate({
                    cookId,
                    bookingRequestContext,
                    menus: evaluationMenus,
                    requestingSession: null,
                    serverRuntime,
                }),
                cookMenuSuggestionFromInventoryGenerate({
                    cookId,
                    bookingRequestContext,
                    requestingSession: null,
                    serverRuntime,
                }),
            ]);

            const menuEvaluation: BookingRequestCookMenuEvaluation = {
                evaluationSummary: ranking.evaluationSummary,
                menus: ranking.menus,
                generatedMenu: generatedDraft,
            };

            await serverRuntime.db
                .update(bookingRequestCooks)
                .set({
                    menuEvaluation,
                    menuEvaluationLoading: false,
                })
                .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));

            await serverRuntime.publish.userUpdates({ userId: cookId });
        } catch (error) {
            serverRuntime.log.error(error, null);
            try {
                await clearLoading(cookId, bookingRequestId, serverRuntime);
            } catch (clearError) {
                serverRuntime.log.error(clearError, null);
            }
        }
    },
    options: {
        retryLimit: 2,
        retryDelay: 30,
        expireInSeconds: 180,
    },
};
