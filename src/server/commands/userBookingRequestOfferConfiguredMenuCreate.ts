import { and, asc, eq, inArray } from 'drizzle-orm';

import { fileUploadPublicUrl } from '../../shared/contentSection';
import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequests,
    meals,
    menuCourseMealOptions,
    menuCourses,
    menus,
} from '../db/schema';
import type { BookingRequestOfferConfiguredMenu } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferConfiguredMenuCreateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferNegotiationAssert } from '../utils/bookingRequestOfferNegotiationAssert';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function userBookingRequestOfferConfiguredMenuCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferConfiguredMenuCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'userBookingRequestOfferConfiguredMenuCreate');

    const { bookingRequestOfferId, menuId, courseSelections } = args;

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, menu: menus })
            .from(bookingRequestOffers)
            .innerJoin(menus, and(eq(menus.bookingRequestOfferId, bookingRequestOffers.bookingRequestOfferId), eq(menus.menuId, menuId)))
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferConfiguredMenuCreate: offer or menu not found');
        }

        bookingRequestOfferNegotiationAssert(row.offer);

        const orderedCourses = await serverRuntime.db
            .select()
            .from(menuCourses)
            .where(eq(menuCourses.menuId, row.menu.menuId))
            .orderBy(asc(menuCourses.index));

        const selectionByCourse = new Map(courseSelections.map((selection) => [selection.courseId, selection.mealIds]));

        const configuredCourses: BookingRequestOfferConfiguredMenu['courses'] = [];

        for (const course of orderedCourses) {
            const mealIds = selectionByCourse.get(course.courseId) ?? [];
            const limit = course.mealSelectionLimit ?? 1;
            const uniqueMealIds = [...new Set(mealIds)];

            if (uniqueMealIds.length < 1 || uniqueMealIds.length > limit || uniqueMealIds.length !== mealIds.length) {
                throw new Error('userBookingRequestOfferConfiguredMenuCreate: invalid course selection');
            }

            const options = await serverRuntime.db
                .select({
                    mealId: meals.mealId,
                    title: meals.title,
                    description: meals.description,
                    imageFileUploadId: meals.imageFileUploadId,
                })
                .from(menuCourseMealOptions)
                .innerJoin(meals, eq(meals.mealId, menuCourseMealOptions.mealId))
                .where(and(eq(menuCourseMealOptions.courseId, course.courseId), inArray(menuCourseMealOptions.mealId, uniqueMealIds)));

            if (options.length !== uniqueMealIds.length) {
                throw new Error('userBookingRequestOfferConfiguredMenuCreate: meal is not an option of this course');
            }

            const optionByMealId = new Map(options.map((option) => [option.mealId, option]));
            configuredCourses.push({
                title: course.title,
                meals: mealIds.map((selectedMealId) => {
                    const option = optionByMealId.get(selectedMealId)!;
                    return {
                        mealTitle: option.title,
                        mealDescription: option.description,
                        mealImageUrl: option.imageFileUploadId ? fileUploadPublicUrl(option.imageFileUploadId) : undefined,
                    };
                }),
            });
        }

        const configuredMenu: BookingRequestOfferConfiguredMenu = {
            menuId: row.menu.menuId,
            title: row.menu.title,
            description: row.menu.description,
            courses: configuredCourses,
        };

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({ configuredMenu })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'USER_CONFIGURED_MENU',
                payload: {},
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
