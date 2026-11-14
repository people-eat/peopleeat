import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, fileUploads, meals, menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicCookMenuFindMany } from './publicCookMenuFindMany';

async function insertPublicCook() {
    const setup = await commandSetup.withUser({ firstName: 'Menu', lastName: 'Chef' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
    });
    return setup;
}

async function insertMenu(
    cookId: string,
    options?: { published?: boolean; withImage?: boolean; withCourse?: boolean; title?: string; publishedAt?: Date },
) {
    const menuId = idCreate();
    await testDb.insert(menus).values({
        menuId,
        cookId,
        title: options?.title ?? `Menu ${menuId.slice(0, 8)}`,
        description: 'Description',
        publishedAt: options?.published === false ? null : (options?.publishedAt ?? new Date()),
    });
    if (options?.withCourse === false) {
        return menuId;
    }
    const mealId = idCreate();
    const courseId = idCreate();
    if (options?.withImage !== false) {
        const imageFileUploadId = idCreate();
        await testDb.insert(fileUploads).values({
            fileUploadId: imageFileUploadId,
            userId: cookId,
            filename: 'meal.jpg',
            mediaType: 'image/jpeg',
            size: 3,
            bytes: Buffer.from([1, 2, 3]),
        });
        await testDb.insert(meals).values({
            mealId,
            cookId,
            title: 'Meal',
            description: 'Description',
            imageFileUploadId,
        });
    } else {
        await testDb.insert(meals).values({
            mealId,
            cookId,
            title: 'Meal',
            description: 'Description',
        });
    }
    await testDb.insert(menuCourses).values({
        courseId,
        menuId,
        cookId,
        index: 0,
        title: 'Starter',
    });
    await testDb.insert(menuCourseMealOptions).values({
        mealOptionId: idCreate(),
        courseId,
        cookId,
        mealId,
        index: 0,
    });
    return menuId;
}

describe('publicCookMenuFindMany', () => {
    it('returns published complete inventory menus with a meal image, newest first', async () => {
        const setup = await insertPublicCook();
        const cookId = setup.user.userId;
        const older = await insertMenu(cookId, {
            title: 'Older',
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });
        const newer = await insertMenu(cookId, {
            title: 'Newer',
            publishedAt: new Date('2024-06-01T00:00:00.000Z'),
        });
        await insertMenu(cookId, { title: 'Draft', published: false });
        await insertMenu(cookId, { title: 'Incomplete', withCourse: false });
        await insertMenu(cookId, { title: 'No image', withImage: false });

        const other = await commandSetup.withUser({ firstName: 'Other', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: other.user.userId });
        await insertMenu(other.user.userId, { title: 'Other cook' });

        const result = await publicCookMenuFindMany({ cookId }, setup.serverRuntime);
        expect(result.map((menu) => menu.menuId)).toEqual([newer, older]);
        expect(result[0]?.title).toBe('Newer');
        expect(result[0]?.courseMealOptionImages.length).toBeGreaterThan(0);
    });
});
