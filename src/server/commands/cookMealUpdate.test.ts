import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { cooks, meals } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMealCreate } from './cookMealCreate';
import { cookMealDelete } from './cookMealDelete';
import { cookMealUpdate } from './cookMealUpdate';

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMealCreate', () => {
    it('inserts a draft meal and returns its id', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();

        const result = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const rows = await testDb.select().from(meals).where(eq(meals.mealId, result.referenceId!));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.title).toBe('Neues Gericht');
        expect(rows[0]!.description).toBe('');
        expect(rows[0]!.publishedAt).toBeNull();
        expect(rows[0]!.deletedAt).toBeNull();
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });
});

describe('cookMealUpdate', () => {
    it('applies a title patch with capitalization', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        const result = await cookMealUpdate(
            cookMutationParent(user.userId),
            { mealId: created.referenceId!, meal: { title: '  tomato soup  ' } },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: created.referenceId });
        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, created.referenceId!));
        expect(row!.title).toBe('Tomato soup');
    });

    it('rejects an empty patch', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        await expect(
            cookMealUpdate(cookMutationParent(user.userId), { mealId: created.referenceId!, meal: {} }, requestingSession, serverRuntime),
        ).rejects.toThrow(/at least one field is required/);

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error')).toBe(true);
    });

    it('publishes via publishedAt and refuses updates on soft-deleted meals', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const mealId = created.referenceId!;

        await cookMealUpdate(
            cookMutationParent(user.userId),
            { mealId, meal: { publishedAt: new Date() } },
            requestingSession,
            serverRuntime,
        );
        const [published] = await testDb.select().from(meals).where(eq(meals.mealId, mealId));
        expect(published!.publishedAt).not.toBeNull();

        await cookMealDelete(cookMutationParent(user.userId), { mealId }, requestingSession, serverRuntime);

        await expect(
            cookMealUpdate(cookMutationParent(user.userId), { mealId, meal: { title: 'Gone' } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/meal not found/);
    });
});

describe('cookMealDelete', () => {
    it('soft-deletes the meal', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const mealId = created.referenceId!;

        const result = await cookMealDelete(cookMutationParent(user.userId), { mealId }, requestingSession, serverRuntime);
        expect(result).toEqual({ success: true, referenceId: mealId });

        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, mealId));
        expect(row!.deletedAt).not.toBeNull();
    });
});
