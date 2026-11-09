import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, meals } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMenuSuggestionFromInventory } from './cookMenuSuggestionFromInventory';
import { cookMenuSuggestionFromInventoryGenerate } from './cookMenuSuggestionFromInventoryGenerate';

vi.mock('./cookMenuSuggestionFromInventoryGenerate', () => ({
    cookMenuSuggestionFromInventoryGenerate: vi.fn(),
}));

describe('cookMenuSuggestionFromInventory', () => {
    beforeEach(() => {
        vi.mocked(cookMenuSuggestionFromInventoryGenerate).mockReset();
    });

    it('rejects when the generator returns no draft and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Empty' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(cookMenuSuggestionFromInventoryGenerate).mockResolvedValue(null);

        // Act
        const pending = cookMenuSuggestionFromInventory(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        // Assert
        await expect(pending).rejects.toThrow(/cook has no meals/);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        const logs = await findLogsForSession(requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('cook has no meals'))).toBe(true);
    });

    it('inserts new draft meals, reuses existing meals, and publishes userUpdates', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Bea', lastName: 'Draft' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const existingMealId = idCreate();
        await testDb.insert(meals).values({
            mealId: existingMealId,
            cookId: user.userId,
            title: 'Tomatensuppe',
            description: 'Tomaten',
        });
        vi.mocked(cookMenuSuggestionFromInventoryGenerate).mockResolvedValue({
            title: 'sommer menü',
            description: 'frische kräuter.',
            courses: [
                {
                    title: 'vorspeise',
                    mealOptions: [
                        { type: 'EXISTING_MEAL', mealId: existingMealId, title: null, description: null },
                        { type: 'NEW_MEAL', mealId: null, title: 'gegrillter fisch', description: 'mit zitrone.' },
                        { type: 'EXISTING_MEAL', mealId: idCreate(), title: null, description: null },
                        { type: 'NEW_MEAL', mealId: null, title: null, description: null },
                    ],
                },
            ],
        });

        // Act
        const result = await cookMenuSuggestionFromInventory(
            cookMutationParent(user.userId),
            { brief: 'Light summer dinner' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        const created = mealRows.find((meal) => meal.mealId !== existingMealId);
        expect(created?.title).toBe('Gegrillter fisch');
        expect(created?.description).toBe('Mit zitrone.');
        expect(created?.publishedAt).toBeNull();
        expect(created?.deletedAt).toBeNull();
        expect(created?.generatedAt).toBeInstanceOf(Date);
        expect(result).toEqual({
            title: 'Sommer menü',
            description: 'Frische kräuter.',
            courses: [{ title: 'Vorspeise', mealIds: [existingMealId, created?.mealId] }],
        });
        expect(cookMenuSuggestionFromInventoryGenerate).toHaveBeenCalledWith({
            cookId: user.userId,
            brief: 'Light summer dinner',
            requestingSession,
            serverRuntime,
        });
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('publishes without inserting when the draft only reuses meals', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Cleo', lastName: 'Reuse' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const existingMealId = idCreate();
        await testDb.insert(meals).values({
            mealId: existingMealId,
            cookId: user.userId,
            title: 'Risotto',
            description: 'Reis',
        });
        vi.mocked(cookMenuSuggestionFromInventoryGenerate).mockResolvedValue({
            title: 'Risotto Menü',
            description: 'Cremig.',
            courses: [
                {
                    title: 'Hauptgang',
                    mealOptions: [{ type: 'EXISTING_MEAL', mealId: existingMealId, title: null, description: null }],
                },
            ],
        });

        // Act
        const result = await cookMenuSuggestionFromInventory(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({
            title: 'Risotto Menü',
            description: 'Cremig.',
            courses: [{ title: 'Hauptgang', mealIds: [existingMealId] }],
        });
        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('logs and rethrows when the generator throws', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Dora', lastName: 'Throw' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const existingMealId = idCreate();
        await testDb.insert(meals).values({
            mealId: existingMealId,
            cookId: user.userId,
            title: 'Suppe',
            description: 'Klar',
        });
        vi.mocked(cookMenuSuggestionFromInventoryGenerate).mockRejectedValue(new Error('model down'));

        // Act
        const pending = cookMenuSuggestionFromInventory(
            cookMutationParent(user.userId),
            { brief: 'Abend' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/model down/);
        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(1);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        const logs = await findLogsForSession(requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('model down'))).toBe(true);
    });
});
