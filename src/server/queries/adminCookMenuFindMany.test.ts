import { describe, expect, it } from 'vitest';

import { fileUploadPublicUrl } from '../../shared/contentSection';
import { idCreate } from '../../shared/idCreate';
import { cooks, fileUploads, meals, menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import type { MenuCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookMenuFindMany } from './adminCookMenuFindMany';

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'Menu', lastName: 'Chef' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

async function insertMenu(cookId: string, overrides: Partial<MenuCreate> = {}) {
    const menuId = overrides.menuId ?? idCreate();
    const [row] = await testDb
        .insert(menus)
        .values({
            menuId,
            cookId,
            title: overrides.title ?? `Menu ${menuId.slice(0, 8)}`,
            description: overrides.description ?? 'Description',
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertMenu: no row');
    return row;
}

describe('adminCookMenuFindMany', () => {
    it('returns seeded inventory menus with course counts ordered by createdAt descending', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `order-${idCreate().slice(0, 8)}`;
        const older = await insertMenu(setup.user.userId, { title: `${token}-older` });
        const newer = await insertMenu(setup.user.userId, { title: `${token}-newer` });
        await testDb.insert(menuCourses).values({
            courseId: idCreate(),
            menuId: newer.menuId,
            cookId: setup.user.userId,
            index: 0,
            title: 'Starter',
        });

        // Act
        const rows = await adminCookMenuFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const olderIdx = rows.findIndex((row) => row.menuId === older.menuId);
        const newerIdx = rows.findIndex((row) => row.menuId === newer.menuId);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
        expect(rows[newerIdx]).toMatchObject({ cookName: 'Menu Chef', courseCount: 1, courseMealOptionImages: [] });
        expect(rows[olderIdx]?.courseCount).toBe(0);
        expect(rows[olderIdx]?.courseMealOptionImages).toEqual([]);
    });

    it('filters by menuIds', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `ids-${idCreate().slice(0, 8)}`;
        const match = await insertMenu(setup.user.userId, { title: `${token}-match` });
        const other = await insertMenu(setup.user.userId, { title: `${token}-other` });

        // Act
        const byId = await adminCookMenuFindMany(
            { criterion: { skip: 0, take: 100, menuIds: [match.menuId], includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const unknown = await adminCookMenuFindMany(
            { criterion: { skip: 0, take: 100, menuIds: [idCreate()], includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const emptyIds = await adminCookMenuFindMany(
            { criterion: { skip: 0, take: 100, menuIds: [], searchText: token, includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const andSearch = await adminCookMenuFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    menuIds: [match.menuId, other.menuId],
                    searchText: `${token}-match`,
                    includeDeleted: true,
                },
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(byId.map((row) => row.menuId)).toEqual([match.menuId]);
        expect(unknown).toEqual([]);
        expect(emptyIds.map((row) => row.menuId).sort()).toEqual([match.menuId, other.menuId].sort());
        expect(andSearch.map((row) => row.menuId)).toEqual([match.menuId]);
    });

    it('returns courseMealOptionImages in course then option order, deduped', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `imgs-${idCreate().slice(0, 8)}`;
        const menu = await insertMenu(setup.user.userId, { title: `${token}-menu` });
        const uploadA = idCreate();
        const uploadB = idCreate();
        await testDb.insert(fileUploads).values([
            {
                fileUploadId: uploadA,
                userId: setup.user.userId,
                filename: 'a.jpg',
                mediaType: 'image/jpeg',
                size: 3,
                bytes: Buffer.from([1, 2, 3]),
            },
            {
                fileUploadId: uploadB,
                userId: setup.user.userId,
                filename: 'b.jpg',
                mediaType: 'image/jpeg',
                size: 3,
                bytes: Buffer.from([4, 5, 6]),
            },
        ]);
        const mealA = idCreate();
        const mealB = idCreate();
        const mealNoImage = idCreate();
        await testDb.insert(meals).values([
            {
                mealId: mealA,
                cookId: setup.user.userId,
                title: 'With A',
                description: '',
                imageFileUploadId: uploadA,
            },
            {
                mealId: mealB,
                cookId: setup.user.userId,
                title: 'With B',
                description: '',
                imageFileUploadId: uploadB,
            },
            { mealId: mealNoImage, cookId: setup.user.userId, title: 'No image', description: '' },
        ]);
        const course0 = idCreate();
        const course1 = idCreate();
        await testDb.insert(menuCourses).values([
            { courseId: course0, menuId: menu.menuId, cookId: setup.user.userId, index: 0, title: 'Starter' },
            { courseId: course1, menuId: menu.menuId, cookId: setup.user.userId, index: 1, title: 'Main' },
        ]);
        await testDb.insert(menuCourseMealOptions).values([
            { mealOptionId: idCreate(), courseId: course0, cookId: setup.user.userId, mealId: mealB, index: 0 },
            { mealOptionId: idCreate(), courseId: course0, cookId: setup.user.userId, mealId: mealNoImage, index: 1 },
            { mealOptionId: idCreate(), courseId: course1, cookId: setup.user.userId, mealId: mealA, index: 0 },
            // Same image again on another course — should be deduped
            { mealOptionId: idCreate(), courseId: course1, cookId: setup.user.userId, mealId: mealB, index: 1 },
        ]);

        // Act
        const rows = await adminCookMenuFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows).toHaveLength(1);
        expect(rows[0]?.courseCount).toBe(2);
        expect(rows[0]?.courseMealOptionImages).toEqual([fileUploadPublicUrl(uploadB), fileUploadPublicUrl(uploadA)]);
    });

    it('filters by searchText and cookId', async () => {
        // Arrange
        const cookA = await setupCook();
        const cookB = await setupCook();
        const token = `search-${idCreate().slice(0, 8)}`;
        const match = await insertMenu(cookA.user.userId, { title: `${token}-match` });
        await insertMenu(cookA.user.userId, { title: 'other-title' });
        const otherCook = await insertMenu(cookB.user.userId, { title: `${token}-other` });

        // Act
        const bySearch = await adminCookMenuFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, includeDeleted: true } },
            cookA.requestingSession,
            cookA.serverRuntime,
        );
        const byCook = await adminCookMenuFindMany(
            { criterion: { skip: 0, take: 100, cookIds: [cookA.user.userId], searchText: token, includeDeleted: true } },
            cookA.requestingSession,
            cookA.serverRuntime,
        );

        // Assert
        expect(bySearch.some((row) => row.menuId === match.menuId)).toBe(true);
        expect(bySearch.some((row) => row.menuId === otherCook.menuId)).toBe(true);
        expect(byCook.map((row) => row.menuId)).toEqual([match.menuId]);
    });

    it('excludes soft-deleted menus when includeDeleted is false', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `del-${idCreate().slice(0, 8)}`;
        const live = await insertMenu(setup.user.userId, { title: `${token}-live` });
        const deleted = await insertMenu(setup.user.userId, {
            title: `${token}-deleted`,
            deletedAt: new Date(),
        });

        // Act
        const rows = await adminCookMenuFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, includeDeleted: false } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows.some((row) => row.menuId === live.menuId)).toBe(true);
        expect(rows.some((row) => row.menuId === deleted.menuId)).toBe(false);
    });

    it('paginates with skip and take', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `page-${idCreate().slice(0, 8)}`;
        await insertMenu(setup.user.userId, { title: `${token}-a` });
        await insertMenu(setup.user.userId, { title: `${token}-b` });
        await insertMenu(setup.user.userId, { title: `${token}-c` });

        // Act
        const page = await adminCookMenuFindMany(
            { criterion: { skip: 0, take: 2, searchText: token, includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const next = await adminCookMenuFindMany(
            { criterion: { skip: 2, take: 2, searchText: token, includeDeleted: true } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(page).toHaveLength(2);
        expect(next).toHaveLength(1);
        expect(new Set([...page, ...next].map((row) => row.menuId)).size).toBe(3);
    });
});
