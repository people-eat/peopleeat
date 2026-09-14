import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, menus } from '../db/schema';
import type { MenuCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookMenuCounts } from './cookMenuCounts';

function cookParent(cookId: string) {
    return { cookId } as Parameters<typeof cookMenuCounts>[0];
}

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

describe('cookMenuCounts', () => {
    it('returns one count per criterion in order and ignores soft-deleted', async () => {
        // Arrange
        const setup = await setupCook();
        const token = `facet-${idCreate().slice(0, 8)}`;
        await insertMenu(setup.user.userId, { title: `${token}-live` });
        await insertMenu(setup.user.userId, { title: `${token}-deleted`, deletedAt: new Date() });
        await insertMenu(setup.user.userId, { title: 'unrelated' });

        // Act
        const [all, matching] = await cookMenuCounts(
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
            cookMenuCounts(cookParent(setup.user.userId), { criteria: [] }, setup.requestingSession, setup.serverRuntime),
        ).rejects.toThrow(/criteria must not be empty/);
    });
});
