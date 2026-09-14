import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, meals } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookMealFindMany } from './cookMealFindMany';

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMealFindMany', () => {
    it("returns the cook's non-deleted meals ordered by createdAt descending", async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const older = idCreate();
        const newer = idCreate();
        await testDb.insert(meals).values({
            mealId: older,
            cookId: user.userId,
            title: 'Older meal',
            description: 'first',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
        });
        await testDb.insert(meals).values({
            mealId: newer,
            cookId: user.userId,
            title: 'Newer meal',
            description: 'second',
            createdAt: new Date('2024-02-01T00:00:00.000Z'),
        });

        // Act
        const rows = await cookMealFindMany(cookParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(rows.map((row) => row.mealId)).toEqual([newer, older]);
    });

    it('excludes soft-deleted meals and meals owned by other cooks', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const other = await setupCook();
        const visible = idCreate();
        const deleted = idCreate();
        await testDb.insert(meals).values({ mealId: visible, cookId: user.userId, title: 'Visible', description: '' });
        await testDb.insert(meals).values({
            mealId: deleted,
            cookId: user.userId,
            title: 'Deleted',
            description: '',
            deletedAt: new Date(),
        });
        await testDb.insert(meals).values({ mealId: idCreate(), cookId: other.user.userId, title: 'Other cook', description: '' });

        // Act
        const rows = await cookMealFindMany(cookParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(rows.map((row) => row.mealId)).toEqual([visible]);
    });
});
