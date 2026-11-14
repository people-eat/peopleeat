import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, fileUploads, meals, menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestDirectMenuResolve } from './bookingRequestDirectMenuResolve';

async function insertCatalogMenu(
    cookId: string,
    options?: { published?: boolean; withImage?: boolean; withCourse?: boolean; title?: string },
) {
    const menuId = idCreate();
    await testDb.insert(menus).values({
        menuId,
        cookId,
        title: options?.title ?? 'Sommer-Menü',
        description: 'Drei Gänge',
        publishedAt: options?.published === false ? null : new Date(),
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
            title: 'Vorspeise',
            description: 'Salat',
            imageFileUploadId,
        });
    } else {
        await testDb.insert(meals).values({
            mealId,
            cookId,
            title: 'Vorspeise',
            description: 'Salat',
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

describe('bookingRequestDirectMenuResolve', () => {
    it('returns a frozen snapshot for a catalog-eligible menu on that cook', async () => {
        const chef = await commandSetup.withUser({ firstName: 'Menu', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: chef.user.userId });
        const menuId = await insertCatalogMenu(chef.user.userId, { title: 'Tasting' });

        const resolved = await bookingRequestDirectMenuResolve(chef.serverRuntime, {
            cookId: chef.user.userId,
            requestedMenuId: menuId,
        });

        expect(resolved?.menuId).toBe(menuId);
        expect(resolved?.title).toBe('Tasting');
        expect(resolved?.courses).toHaveLength(1);
        expect(resolved?.courses[0]?.meals[0]?.mealTitle).toBe('Vorspeise');
    });

    it('returns null when the menu is unpublished, incomplete, or belongs to another cook', async () => {
        const chef = await commandSetup.withUser({ firstName: 'Owner', lastName: 'Chef' });
        const other = await commandSetup.withUser({ firstName: 'Other', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: chef.user.userId });
        await testDb.insert(cooks).values({ cookId: other.user.userId });
        const unpublished = await insertCatalogMenu(chef.user.userId, { published: false });
        const incomplete = await insertCatalogMenu(chef.user.userId, { withCourse: false });
        const noImage = await insertCatalogMenu(chef.user.userId, { withImage: false });
        const otherMenu = await insertCatalogMenu(other.user.userId);

        const runtime = chef.serverRuntime;
        expect(await bookingRequestDirectMenuResolve(runtime, { cookId: chef.user.userId, requestedMenuId: unpublished })).toBeNull();
        expect(await bookingRequestDirectMenuResolve(runtime, { cookId: chef.user.userId, requestedMenuId: incomplete })).toBeNull();
        expect(await bookingRequestDirectMenuResolve(runtime, { cookId: chef.user.userId, requestedMenuId: noImage })).toBeNull();
        expect(await bookingRequestDirectMenuResolve(runtime, { cookId: chef.user.userId, requestedMenuId: otherMenu })).toBeNull();
        expect(await bookingRequestDirectMenuResolve(runtime, { cookId: chef.user.userId, requestedMenuId: '  ' })).toBeNull();
    });
});
