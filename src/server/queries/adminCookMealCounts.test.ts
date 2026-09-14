import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, meals } from '../db/schema';
import type { MealCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookMealCounts } from './adminCookMealCounts';

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

describe('adminCookMealCounts', () => {
    it('returns one count per criterion in order', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `facet-${idCreate().slice(0, 8)}`;
        await insertMeal(setup.user.userId, { title: `${token}-live` });
        await insertMeal(setup.user.userId, { title: `${token}-deleted`, deletedAt: new Date() });

        // Act
        const [withDeleted, liveOnly] = await adminCookMealCounts(
            {
                criteria: [
                    { searchText: token, includeDeleted: true },
                    { searchText: token, includeDeleted: false },
                ],
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(withDeleted).toBe(2);
        expect(liveOnly).toBe(1);
    });

    it('counts rows matching searchText and cookId', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `count-${idCreate().slice(0, 8)}`;
        await insertMeal(setup.user.userId, { title: `${token}-a` });
        await insertMeal(setup.user.userId, { title: `${token}-b` });
        await insertMeal(setup.user.userId, { title: 'unrelated' });

        // Act
        const [total, byCook] = await adminCookMealCounts(
            {
                criteria: [
                    { searchText: token, includeDeleted: true },
                    { cookIds: [setup.user.userId], searchText: token, includeDeleted: true },
                ],
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(total).toBe(2);
        expect(byCook).toBe(2);
    });

    it('rejects an empty criteria list', async () => {
        // Arrange
        const setup = await setupCook();

        // Act / Assert
        await expect(adminCookMealCounts({ criteria: [] }, setup.requestingSession, setup.serverRuntime)).rejects.toThrow(
            /criteria must not be empty/,
        );
    });
});
