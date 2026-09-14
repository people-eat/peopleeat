import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, meals } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookMealFindOne } from './cookMealFindOne';

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMealFindOne', () => {
    it('returns the mapped meal on a hit', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const mealId = idCreate();
        await testDb.insert(meals).values({ mealId, cookId: user.userId, title: 'Signature dish', description: 'Tasty' });

        // Act
        const row = await cookMealFindOne(cookParent(user.userId), { mealId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({ mealId, title: 'Signature dish', description: 'Tasty' });
    });

    it('returns null when the meal id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act
        const row = await cookMealFindOne(cookParent(user.userId), { mealId: idCreate() }, requestingSession, serverRuntime);

        // Assert
        expect(row).toBeNull();
    });

    it('returns null for a soft-deleted meal', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const mealId = idCreate();
        await testDb.insert(meals).values({
            mealId,
            cookId: user.userId,
            title: 'Gone dish',
            description: '',
            deletedAt: new Date(),
        });

        // Act
        const row = await cookMealFindOne(cookParent(user.userId), { mealId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toBeNull();
    });

    it('returns null when the meal belongs to another cook', async () => {
        // Arrange
        const owner = await setupCook();
        const other = await setupCook();
        const mealId = idCreate();
        await testDb.insert(meals).values({ mealId, cookId: owner.user.userId, title: 'Owner dish', description: '' });

        // Act
        const row = await cookMealFindOne(cookParent(other.user.userId), { mealId }, other.requestingSession, other.serverRuntime);

        // Assert
        expect(row).toBeNull();
    });
});
