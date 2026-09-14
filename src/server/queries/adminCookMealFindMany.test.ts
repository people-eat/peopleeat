import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, meals } from '../db/schema';
import type { MealCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookMealFindMany } from './adminCookMealFindMany';

async function setupCookWithMeals() {
    const setup = await commandSetup.withUser({ firstName: 'Meal', lastName: 'Chef' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

async function insertMeal(cookId: string, overrides: Partial<MealCreate> = {}) {
    const mealId = overrides.mealId ?? idCreate();
    const [row] = await testDb
        .insert(meals)
        .values({
            mealId,
            cookId,
            title: overrides.title ?? `Meal ${mealId.slice(0, 8)}`,
            description: overrides.description ?? 'Description',
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertMeal: no row');
    return row;
}

describe('adminCookMealFindMany', () => {
    it('returns seeded meals ordered by createdAt descending', async () => {
        // Arrange
        const setup = await setupCookWithMeals();
        const token = `order-${idCreate().slice(0, 8)}`;
        const older = await insertMeal(setup.user.userId, { title: `${token}-older` });
        const newer = await insertMeal(setup.user.userId, { title: `${token}-newer` });

        // Act
        const rows = await adminCookMealFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const olderIdx = rows.findIndex((row) => row.mealId === older.mealId);
        const newerIdx = rows.findIndex((row) => row.mealId === newer.mealId);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
        expect(rows[newerIdx]?.cookName).toBe('Meal Chef');
    });

    it('filters by searchText and cookId', async () => {
        // Arrange
        const cookA = await setupCookWithMeals();
        const cookB = await setupCookWithMeals();
        const token = `search-${idCreate().slice(0, 8)}`;
        const match = await insertMeal(cookA.user.userId, { title: `${token}-match` });
        await insertMeal(cookA.user.userId, { title: 'other-title' });
        const otherCook = await insertMeal(cookB.user.userId, { title: `${token}-other-cook` });

        // Act
        const bySearch = await adminCookMealFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, includeDeleted: true } },
            cookA.requestingSession,
            cookA.serverRuntime,
        );
        const byCook = await adminCookMealFindMany(
            { criterion: { skip: 0, take: 100, cookIds: [cookA.user.userId], searchText: token, includeDeleted: true } },
            cookA.requestingSession,
            cookA.serverRuntime,
        );

        // Assert
        expect(bySearch.some((row) => row.mealId === match.mealId)).toBe(true);
        expect(bySearch.some((row) => row.mealId === otherCook.mealId)).toBe(true);
        expect(byCook.map((row) => row.mealId)).toEqual([match.mealId]);
    });

    it('excludes soft-deleted meals when includeDeleted is false', async () => {
        // Arrange
        const setup = await setupCookWithMeals();
        const token = `del-${idCreate().slice(0, 8)}`;
        const live = await insertMeal(setup.user.userId, { title: `${token}-live` });
        const deleted = await insertMeal(setup.user.userId, {
            title: `${token}-deleted`,
            deletedAt: new Date(),
        });

        // Act
        const rows = await adminCookMealFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, includeDeleted: false } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows.some((row) => row.mealId === live.mealId)).toBe(true);
        expect(rows.some((row) => row.mealId === deleted.mealId)).toBe(false);
    });

    it('paginates with skip and take', async () => {
        // Arrange
        const setup = await setupCookWithMeals();
        const token = `page-${idCreate().slice(0, 8)}`;
        await insertMeal(setup.user.userId, { title: `${token}-a` });
        await insertMeal(setup.user.userId, { title: `${token}-b` });
        await insertMeal(setup.user.userId, { title: `${token}-c` });

        // Act
        const page = await adminCookMealFindMany(
            { criterion: { skip: 0, take: 2, searchText: token, includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const next = await adminCookMealFindMany(
            { criterion: { skip: 2, take: 2, searchText: token, includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(page).toHaveLength(2);
        expect(next).toHaveLength(1);
        expect(new Set([...page, ...next].map((row) => row.mealId)).size).toBe(3);
    });

    it('filters by status PUBLISHED DRAFT DELETED', async () => {
        // Arrange
        const setup = await setupCookWithMeals();
        const token = `status-${idCreate().slice(0, 8)}`;
        const published = await insertMeal(setup.user.userId, {
            title: `${token}-published`,
            publishedAt: new Date(),
        });
        const draft = await insertMeal(setup.user.userId, { title: `${token}-draft` });
        const deleted = await insertMeal(setup.user.userId, {
            title: `${token}-deleted`,
            publishedAt: new Date(),
            deletedAt: new Date(),
        });

        // Act
        const publishedRows = await adminCookMealFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, includeDeleted: true, status: 'PUBLISHED' } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const draftRows = await adminCookMealFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, includeDeleted: true, status: 'DRAFT' } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const deletedRows = await adminCookMealFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, includeDeleted: true, status: 'DELETED' } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(publishedRows.map((row) => row.mealId)).toEqual([published.mealId]);
        expect(draftRows.map((row) => row.mealId)).toEqual([draft.mealId]);
        expect(deletedRows.map((row) => row.mealId)).toEqual([deleted.mealId]);
    });

    it('filters imageFilter and matches description or cook name', async () => {
        // Arrange
        const setup = await setupCookWithMeals();
        const descToken = `desc-${idCreate().slice(0, 8)}`;
        const withoutImage = await insertMeal(setup.user.userId, {
            title: `meal-${idCreate().slice(0, 8)}`,
            description: `${descToken} creamy`,
            publishedAt: new Date(),
        });
        await insertMeal(setup.user.userId, {
            title: `meal-${idCreate().slice(0, 8)}`,
            publishedAt: new Date(),
        });

        // Act
        const notOnPublic = await adminCookMealFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    cookIds: [setup.user.userId],
                    includeDeleted: true,
                    imageFilter: 'NOT_ON_PUBLIC_PAGE',
                },
            },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const withoutAnyImage = await adminCookMealFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    cookIds: [setup.user.userId],
                    includeDeleted: true,
                    imageFilter: 'WITHOUT_IMAGE',
                },
            },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const byDescription = await adminCookMealFindMany(
            { criterion: { skip: 0, take: 100, searchText: descToken, includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const byCookName = await adminCookMealFindMany(
            { criterion: { skip: 0, take: 100, searchText: 'Meal Chef', includeDeleted: true, cookIds: [setup.user.userId] } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(notOnPublic.some((row) => row.mealId === withoutImage.mealId)).toBe(true);
        expect(withoutAnyImage.some((row) => row.mealId === withoutImage.mealId)).toBe(true);
        expect(byDescription.map((row) => row.mealId)).toEqual([withoutImage.mealId]);
        expect(byCookName.some((row) => row.mealId === withoutImage.mealId)).toBe(true);
    });
});
