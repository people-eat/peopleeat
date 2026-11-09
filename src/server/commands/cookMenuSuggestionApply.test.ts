import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, meals, menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { cookMenuSuggestionApply } from './cookMenuSuggestionApply';

vi.mock('../utils/featureToggleIsEnabled', () => ({
    featureToggleIsEnabled: vi.fn(async () => true),
}));

describe('cookMenuSuggestionApply', () => {
    beforeEach(() => {
        vi.mocked(featureToggleIsEnabled).mockReset();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(true);
    });

    it('rejects when AI_MENU_CREATE is disabled', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Off' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(false);

        await expect(
            cookMenuSuggestionApply(
                cookMutationParent(user.userId),
                {
                    suggestion: {
                        title: 'Menü',
                        description: '',
                        courses: [{ title: 'Vorspeise', mealOptions: [] }],
                    },
                },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/AI_MENU_CREATE is disabled/);
    });

    it('inserts new draft meals and a generated inventory menu in one transaction', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Bea', lastName: 'Apply' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const existingMealId = idCreate();
        await testDb.insert(meals).values({
            mealId: existingMealId,
            cookId: user.userId,
            title: 'Tomatensuppe',
            description: 'Tomaten',
        });

        const result = await cookMenuSuggestionApply(
            cookMutationParent(user.userId),
            {
                suggestion: {
                    title: 'sommer menü',
                    description: 'leicht und frisch.',
                    courses: [
                        {
                            title: 'vorspeise',
                            mealOptions: [
                                { type: 'EXISTING_MEAL', mealId: existingMealId, title: null, description: null },
                                { type: 'NEW_MEAL', mealId: null, title: 'gegrillter fisch', description: 'mit zitrone.' },
                            ],
                        },
                    ],
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const menuId = result.referenceId!;
        const [menu] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(menu?.title).toBe('Sommer menü');
        expect(menu?.description).toBe('Leicht und frisch.');
        expect(menu?.publishedAt).toBeNull();
        expect(menu?.bookingRequestOfferId).toBeNull();
        expect(menu?.generatedAt).toBeInstanceOf(Date);

        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(2);
        const created = mealRows.find((meal) => meal.mealId !== existingMealId);
        expect(created?.title).toBe('Gegrillter fisch');
        expect(created?.generatedAt).toBeInstanceOf(Date);
        const reused = mealRows.find((meal) => meal.mealId === existingMealId);
        expect(reused?.generatedAt).toBeNull();

        const courses = await testDb.select().from(menuCourses).where(eq(menuCourses.menuId, menuId));
        expect(courses).toHaveLength(1);
        const options = await testDb
            .select()
            .from(menuCourseMealOptions)
            .where(and(eq(menuCourseMealOptions.courseId, courses[0]!.courseId)));
        expect(options.map((option) => option.mealId)).toEqual([existingMealId, created?.mealId]);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects when the suggestion has no usable courses', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Cleo', lastName: 'Empty' });
        await testDb.insert(cooks).values({ cookId: user.userId });

        await expect(
            cookMenuSuggestionApply(
                cookMutationParent(user.userId),
                {
                    suggestion: {
                        title: 'Leer',
                        description: '',
                        courses: [
                            {
                                title: 'Vorspeise',
                                mealOptions: [{ type: 'EXISTING_MEAL', mealId: idCreate(), title: null, description: null }],
                            },
                        ],
                    },
                },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/no usable courses/);

        const menuRows = await testDb.select().from(menus).where(eq(menus.cookId, user.userId));
        expect(menuRows).toHaveLength(0);
        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(0);
    });
});
