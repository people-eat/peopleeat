import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequests, cooks, meals, menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { cookBookingRequestGeneratedMenuApply } from './cookBookingRequestGeneratedMenuApply';

vi.mock('../utils/featureToggleIsEnabled', () => ({
    featureToggleIsEnabled: vi.fn(async () => true),
}));

const berlin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

describe('cookBookingRequestGeneratedMenuApply', () => {
    beforeEach(() => {
        vi.mocked(featureToggleIsEnabled).mockReset();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(true);
    });

    it('materializes the stored generated menu into a draft inventory menu', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Apply' });
        await testDb.insert(cooks).values({ cookId: setup.user.userId });

        const mealId = idCreate();
        await testDb.insert(meals).values({
            mealId,
            cookId: setup.user.userId,
            title: 'Tomato soup',
            description: 'Fresh tomatoes',
            publishedAt: null,
            deletedAt: null,
        });

        const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: { ...berlin, latitude: 52.53, longitude: 13.41 },
            priceClassType: 'HIGH',
            originalMessage: 'Hello',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestCooks).values({
            cookId: setup.user.userId,
            bookingRequestId,
            menuEvaluationLoading: false,
            menuEvaluation: {
                evaluationSummary: 'Try this',
                menus: [],
                generatedMenu: {
                    title: 'summer evening',
                    description: 'light and fresh',
                    courses: [
                        {
                            title: 'vorspeise',
                            mealOptions: [
                                {
                                    type: 'EXISTING_MEAL',
                                    mealId,
                                    title: null,
                                    description: null,
                                },
                            ],
                        },
                        {
                            title: 'hauptspeise',
                            mealOptions: [
                                {
                                    type: 'NEW_MEAL',
                                    mealId: null,
                                    title: 'herb risotto',
                                    description: 'creamy rice with herbs',
                                },
                            ],
                        },
                    ],
                },
            },
            firstOpenedAt: new Date(),
        });

        const result = await cookBookingRequestGeneratedMenuApply(
            cookMutationParent(setup.user.userId),
            { bookingRequestId },
            setup.requestingSession,
            setup.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const menuId = result.referenceId!;

        const [menu] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(menu?.title).toBe('Summer evening');
        expect(menu?.description).toBe('Light and fresh');
        expect(menu?.bookingRequestOfferId).toBeNull();

        const courses = await testDb.select().from(menuCourses).where(eq(menuCourses.menuId, menuId));
        expect(courses).toHaveLength(2);

        const options = await testDb
            .select()
            .from(menuCourseMealOptions)
            .where(and(eq(menuCourseMealOptions.cookId, setup.user.userId)));
        const optionMealIds = options.filter((row) => courses.some((course) => course.courseId === row.courseId)).map((row) => row.mealId);
        expect(optionMealIds).toContain(mealId);
        expect(optionMealIds).toHaveLength(2);

        const newMeals = await testDb
            .select()
            .from(meals)
            .where(and(eq(meals.cookId, setup.user.userId)));
        expect(newMeals.some((meal) => meal.title === 'Herb risotto')).toBe(true);
        expect(setup.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: setup.user.userId });

        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, setup.user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.menuEvaluation?.generatedMenu).toBeNull();
        expect(details?.menuEvaluation?.evaluationSummary).toBe('');
        expect(details?.menuEvaluation?.menus[0]).toEqual({
            menuId,
            isSuitable: true,
            evaluationSummary: 'Von der Plattform für diese Anfrage empfohlen.',
        });

        await expect(
            cookBookingRequestGeneratedMenuApply(
                cookMutationParent(setup.user.userId),
                { bookingRequestId },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(/no generated menu recommendation/);
    });
});
