import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, meals } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMealCreate } from './cookMealCreate';
import { cookMealDelete } from './cookMealDelete';
import { cookMenuCreate } from './cookMenuCreate';
import { cookMenuUpdate } from './cookMenuUpdate';

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMealDelete', () => {
    it('soft-deletes the meal and publishes userUpdates', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const mealId = created.referenceId!;
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act
        const result = await cookMealDelete(cookMutationParent(user.userId), { mealId }, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ success: true, referenceId: mealId });
        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, mealId));
        expect(row!.deletedAt).not.toBeNull();
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects a missing meal without publishing', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const missingId = idCreate();

        // Act + Assert
        await expect(
            cookMealDelete(cookMutationParent(user.userId), { mealId: missingId }, requestingSession, serverRuntime),
        ).rejects.toThrow(/meal not found/);

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows.some((row) => row.level === 'error' && /meal not found/.test(row.message))).toBe(true);
    });

    it('rejects a meal owned by another cook without publishing', async () => {
        // Arrange
        const owner = await setupCook();
        const other = await setupCook();
        const created = await cookMealCreate(cookMutationParent(owner.user.userId), {}, owner.requestingSession, owner.serverRuntime);

        // Act + Assert
        await expect(
            cookMealDelete(
                cookMutationParent(other.user.userId),
                { mealId: created.referenceId! },
                other.requestingSession,
                other.serverRuntime,
            ),
        ).rejects.toThrow(/meal not found/);

        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, created.referenceId!));
        expect(row!.deletedAt).toBeNull();
        expect(other.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects a second delete on an already soft-deleted meal', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const mealId = created.referenceId!;
        await cookMealDelete(cookMutationParent(user.userId), { mealId }, requestingSession, serverRuntime);
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act + Assert
        await expect(cookMealDelete(cookMutationParent(user.userId), { mealId }, requestingSession, serverRuntime)).rejects.toThrow(
            /meal not found/,
        );

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /meal not found/.test(row.message))).toBe(true);
    });

    it('rejects delete when the meal is the sole option on a course', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const meal = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const menu = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        await cookMenuUpdate(
            cookMutationParent(user.userId),
            {
                menuId: menu.referenceId!,
                menu: {
                    courses: [{ title: 'Amuse', mealIds: [meal.referenceId!], mealSelectionLimit: null }],
                },
            },
            requestingSession,
            serverRuntime,
        );
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act + Assert
        await expect(
            cookMealDelete(cookMutationParent(user.userId), { mealId: meal.referenceId! }, requestingSession, serverRuntime),
        ).rejects.toThrow(/sole option on a course/);

        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, meal.referenceId!));
        expect(row!.deletedAt).toBeNull();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((entry) => entry.level === 'error' && /sole option on a course/.test(entry.message))).toBe(true);
    });
});
