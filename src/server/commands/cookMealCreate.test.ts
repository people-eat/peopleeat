import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { cooks, meals } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMealCreate } from './cookMealCreate';

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMealCreate', () => {
    it('inserts a draft meal without input and publishes userUpdates', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act
        const result = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const rows = await testDb.select().from(meals).where(eq(meals.mealId, result.referenceId!));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.cookId).toBe(user.userId);
        expect(rows[0]!.title).toBe('Neues Gericht');
        expect(rows[0]!.description).toBe('');
        expect(rows[0]!.publishedAt).toBeNull();
        expect(rows[0]!.deletedAt).toBeNull();
        expect(rows[0]!.imageFileUploadId).toBeNull();
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('creates a meal from CookMealCreate title and description', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();

        const result = await cookMealCreate(
            cookMutationParent(user.userId),
            { meal: { title: 'tomato soup', description: 'with basil' } },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, result.referenceId!));
        expect(row!.title).toBe('Tomato soup');
        expect(row!.description).toBe('With basil');
    });

    it('rejects when the cook row is missing and logs the error', async () => {
        // Arrange — user exists (legal acceptance passes) but no cooks row → FK failure on insert.
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'not-a-cook', lastName: 'User' });

        // Act + Assert
        await expect(cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime)).rejects.toThrow();

        const [mealRows, logRows] = await Promise.all([
            testDb.select().from(meals).where(eq(meals.cookId, user.userId)),
            findLogsForSession(requestingSession.sessionId),
        ]);
        expect(mealRows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows.some((row) => row.level === 'error')).toBe(true);
    });
});
