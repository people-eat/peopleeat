import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { cookBookingRequestMenuEvaluationGenerate } from '../../commands/cookBookingRequestMenuEvaluationGenerate';
import { cookMenuSuggestionFromInventoryGenerate } from '../../commands/cookMenuSuggestionFromInventoryGenerate';
import { bookingRequestCooks, bookingRequests, cooks, meals, menuCourseMealOptions, menuCourses, menus } from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { cookBookingRequestMenuEvaluationGenerateJob } from './cookBookingRequestMenuEvaluationGenerate';

vi.mock('../../commands/cookBookingRequestMenuEvaluationGenerate', () => ({
    cookBookingRequestMenuEvaluationGenerate: vi.fn(async () => ({
        evaluationSummary: 'Banner',
        menus: [{ menuId: 'will-replace', evaluationSummary: 'Good', isSuitable: true }],
    })),
}));

vi.mock('../../commands/cookMenuSuggestionFromInventoryGenerate', () => ({
    cookMenuSuggestionFromInventoryGenerate: vi.fn(async () => ({
        title: 'Suggested',
        description: 'From inventory',
        courses: [
            {
                title: 'Vorspeise',
                mealOptions: [{ type: 'EXISTING_MEAL' as const, mealId: null, title: null, description: null }],
            },
        ],
    })),
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

describe('cookBookingRequestMenuEvaluationGenerateJob', () => {
    beforeEach(() => {
        vi.mocked(cookBookingRequestMenuEvaluationGenerate).mockClear();
        vi.mocked(cookMenuSuggestionFromInventoryGenerate).mockClear();
    });

    it('writes ranking + generated menu and clears loading', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Job' });
        await testDb.insert(cooks).values({ cookId: setup.user.userId });

        const mealId = idCreate();
        const menuId = idCreate();
        const courseId = idCreate();
        await testDb.insert(meals).values({
            mealId,
            cookId: setup.user.userId,
            title: 'Soup',
            description: 'Warm',
            publishedAt: null,
            deletedAt: null,
        });
        await testDb.insert(menus).values({
            menuId,
            cookId: setup.user.userId,
            title: 'Classic',
            description: '',
            publishedAt: null,
            deletedAt: null,
        });
        await testDb.insert(menuCourses).values({
            courseId,
            menuId,
            cookId: setup.user.userId,
            index: 0,
            title: 'Vorspeise',
            mealSelectionLimit: null,
        });
        await testDb.insert(menuCourseMealOptions).values({
            mealOptionId: idCreate(),
            courseId,
            cookId: setup.user.userId,
            mealId,
            index: 0,
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
            preferences: ['vegetarian'],
        });
        await testDb.insert(bookingRequestCooks).values({
            cookId: setup.user.userId,
            bookingRequestId,
            menuEvaluationLoading: true,
            firstOpenedAt: new Date(),
        });

        vi.mocked(cookBookingRequestMenuEvaluationGenerate).mockResolvedValueOnce({
            evaluationSummary: 'Banner',
            menus: [{ menuId, evaluationSummary: 'Good', isSuitable: true }],
        });

        await cookBookingRequestMenuEvaluationGenerateJob.handler({
            data: { cookId: setup.user.userId, bookingRequestId },
            serverRuntime: setup.serverRuntime,
        });

        expect(cookBookingRequestMenuEvaluationGenerate).toHaveBeenCalled();
        expect(cookMenuSuggestionFromInventoryGenerate).toHaveBeenCalled();

        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, setup.user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.menuEvaluationLoading).toBe(false);
        expect(details?.menuEvaluation?.evaluationSummary).toBe('Banner');
        expect(details?.menuEvaluation?.menus).toEqual([{ menuId, evaluationSummary: 'Good', isSuitable: true }]);
        expect(details?.menuEvaluation?.generatedMenu?.title).toBe('Suggested');
        expect(setup.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: setup.user.userId });
    });

    it('clears loading when a generator throws', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Fail' });
        await testDb.insert(cooks).values({ cookId: setup.user.userId });
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
            menuEvaluationLoading: true,
            firstOpenedAt: new Date(),
        });

        vi.mocked(cookBookingRequestMenuEvaluationGenerate).mockRejectedValueOnce(new Error('llm failed'));

        await cookBookingRequestMenuEvaluationGenerateJob.handler({
            data: { cookId: setup.user.userId, bookingRequestId },
            serverRuntime: setup.serverRuntime,
        });

        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, setup.user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.menuEvaluationLoading).toBe(false);
        expect(details?.menuEvaluation).toBeNull();
    });
});
