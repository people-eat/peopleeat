import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, fileUploads, meals } from '../db/schema';
import type { MealCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicCookMealFindMany } from './publicCookMealFindMany';

async function insertPublicCook() {
    const setup = await commandSetup.withUser({ firstName: 'Meal', lastName: 'Chef' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
    });
    return setup;
}

async function insertMealImage(cookId: string) {
    const fileUploadId = idCreate();
    await testDb.insert(fileUploads).values({
        fileUploadId,
        userId: cookId,
        filename: 'meal.jpg',
        mediaType: 'image/jpeg',
        size: 3,
        bytes: Buffer.from([1, 2, 3]),
    });
    return fileUploadId;
}

async function insertMealWithImage(cookId: string, overrides: Partial<MealCreate> = {}) {
    const imageFileUploadId = overrides.imageFileUploadId ?? (await insertMealImage(cookId));
    const mealId = overrides.mealId ?? idCreate();
    const [row] = await testDb
        .insert(meals)
        .values({
            mealId,
            cookId,
            title: overrides.title ?? `Meal ${mealId.slice(0, 8)}`,
            description: overrides.description ?? 'Description',
            ...overrides,
            imageFileUploadId,
        })
        .returning();
    if (!row) throw new Error('insertMealWithImage: no row');
    return row;
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

describe('publicCookMealFindMany', () => {
    it('returns only published non-deleted meals with images ordered by publishedAt descending', async () => {
        // Arrange
        const setup = await insertPublicCook();
        const older = await insertMealWithImage(setup.user.userId, {
            title: 'Older published',
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });
        const newer = await insertMealWithImage(setup.user.userId, {
            title: 'Newer published',
            publishedAt: new Date('2024-06-01T00:00:00.000Z'),
        });
        await insertMealWithImage(setup.user.userId, { title: 'Draft', publishedAt: null });
        await insertMealWithImage(setup.user.userId, {
            title: 'Deleted published',
            publishedAt: new Date('2024-03-01T00:00:00.000Z'),
            deletedAt: new Date('2024-07-01T00:00:00.000Z'),
        });
        await insertMeal(setup.user.userId, {
            title: 'Published without image',
            publishedAt: new Date('2024-05-01T00:00:00.000Z'),
        });

        // Act
        const rows = await publicCookMealFindMany({ cookId: setup.user.userId }, setup.serverRuntime);

        // Assert
        expect(rows.map((row) => row.mealId)).toEqual([newer.mealId, older.mealId]);
        expect(rows[0]).toMatchObject({ title: 'Newer published', description: 'Description' });
        expect(rows[0]?.imageUrl).toBeTruthy();
    });
});
