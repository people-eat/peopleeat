import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, menus } from '../db/schema';
import type { MenuCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookMenuCounts } from './adminCookMenuCounts';

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'Count', lastName: 'Menu' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

async function insertMenu(cookId: string, overrides: Partial<MenuCreate> = {}) {
    await testDb.insert(menus).values({
        menuId: overrides.menuId ?? idCreate(),
        cookId,
        title: overrides.title ?? 'Menu',
        description: 'Description',
        ...overrides,
    });
}

describe('adminCookMenuCounts', () => {
    it('returns one count per criterion in order', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `facet-${idCreate().slice(0, 8)}`;
        await insertMenu(setup.user.userId, { title: `${token}-live` });
        await insertMenu(setup.user.userId, { title: `${token}-deleted`, deletedAt: new Date() });

        // Act
        const [withDeleted, liveOnly] = await adminCookMenuCounts(
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

    it('counts inventory menus matching searchText', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `count-${idCreate().slice(0, 8)}`;
        await insertMenu(setup.user.userId, { title: `${token}-a` });
        await insertMenu(setup.user.userId, { title: `${token}-b` });
        await insertMenu(setup.user.userId, { title: 'unrelated' });

        // Act
        const [total] = await adminCookMenuCounts(
            { criteria: [{ searchText: token, includeDeleted: true }] },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(total).toBe(2);
    });

    it('rejects an empty criteria list', async () => {
        // Arrange
        const setup = await setupCook();

        // Act / Assert
        await expect(adminCookMenuCounts({ criteria: [] }, setup.requestingSession, setup.serverRuntime)).rejects.toThrow(
            /criteria must not be empty/,
        );
    });
});
