import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, meals } from '../db/schema';
import type { MealCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookMealCounts } from './cookMealCounts';

function cookParent(cookId: string) {
    return { cookId } as Parameters<typeof cookMealCounts>[0];
}

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'Count', lastName: 'Chef' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

async function insertMeal(cookId: string, overrides: Partial<MealCreate> = {}) {
    await testDb.insert(meals).values({
        mealId: overrides.mealId ?? idCreate(),
        cookId,
        title: overrides.title ?? 'Meal',
        description: 'Description',
        ...overrides,
    });
}

describe('cookMealCounts', () => {
    it('returns one count per criterion in order and ignores soft-deleted', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `facet-${idCreate().slice(0, 8)}`;
        await insertMeal(setup.user.userId, { title: `${token}-live` });
        await insertMeal(setup.user.userId, { title: `${token}-deleted`, deletedAt: new Date() });
        await insertMeal(setup.user.userId, { title: 'unrelated' });

        // Act
        const [all, matching] = await cookMealCounts(
            cookParent(setup.user.userId),
            {
                criteria: [{}, { searchText: token }],
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(all).toBe(2);
        expect(matching).toBe(1);
    });

    it('rejects an empty criteria list', async () => {
        // Arrange
        const setup = await setupCook();

        // Act / Assert
        await expect(
            cookMealCounts(cookParent(setup.user.userId), { criteria: [] }, setup.requestingSession, setup.serverRuntime),
        ).rejects.toThrow(/criteria must not be empty/);
    });
});
