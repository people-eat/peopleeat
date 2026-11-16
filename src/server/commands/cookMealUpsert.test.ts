import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, fileUploads, meals } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMealDelete } from './cookMealDelete';
import { cookMealUpsert } from './cookMealUpsert';

// cookMealDelete is exercised here only for soft-delete × upsert interaction.

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMealUpsert', () => {
    it('inserts a draft meal without input and publishes userUpdates', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();

        const result = await cookMealUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

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

    it('creates a meal from title and description', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();

        const result = await cookMealUpsert(
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

    it('rejects insert when the cook row is missing and logs the error', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'not-a-cook', lastName: 'User' });

        await expect(cookMealUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime)).rejects.toThrow();

        const [mealRows, logRows] = await Promise.all([
            testDb.select().from(meals).where(eq(meals.cookId, user.userId)),
            findLogsForSession(requestingSession.sessionId),
        ]);
        expect(mealRows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows.some((row) => row.level === 'error')).toBe(true);
    });

    it('applies a title patch with capitalization', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMealUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        const result = await cookMealUpsert(
            cookMutationParent(user.userId),
            { meal: { mealId: created.referenceId!, title: '  tomato soup  ' } },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: created.referenceId });
        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, created.referenceId!));
        expect(row!.title).toBe('Tomato soup');
    });

    it('rejects an empty patch', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMealUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        await expect(
            cookMealUpsert(cookMutationParent(user.userId), { meal: { mealId: created.referenceId! } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/at least one field is required/);

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error')).toBe(true);
    });

    it('publishes via publishedAt and refuses updates on soft-deleted meals', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMealUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const mealId = created.referenceId!;

        await cookMealUpsert(
            cookMutationParent(user.userId),
            { meal: { mealId, publishedAt: new Date() } },
            requestingSession,
            serverRuntime,
        );
        const [published] = await testDb.select().from(meals).where(eq(meals.mealId, mealId));
        expect(published!.publishedAt).not.toBeNull();

        await cookMealDelete(cookMutationParent(user.userId), { mealId }, requestingSession, serverRuntime);

        await expect(
            cookMealUpsert(cookMutationParent(user.userId), { meal: { mealId, title: 'Gone' } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/meal not found/);
    });

    it('auto-publishes when an image is added to a draft', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMealUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const mealId = created.referenceId!;
        const imageFileUploadId = idCreate();
        const bytes = Buffer.from('meal');
        await testDb.insert(fileUploads).values({
            fileUploadId: imageFileUploadId,
            userId: user.userId,
            filename: 'meal.jpg',
            mediaType: 'image/jpeg',
            size: bytes.byteLength,
            bytes,
        });

        await cookMealUpsert(
            cookMutationParent(user.userId),
            { meal: { mealId, imageFileUploadId } },
            requestingSession,
            serverRuntime,
        );

        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, mealId));
        expect(row!.imageFileUploadId).toBe(imageFileUploadId);
        expect(row!.publishedAt).not.toBeNull();
    });

    it('creates published when an image is attached on insert', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const imageFileUploadId = idCreate();
        const bytes = Buffer.from('meal');
        await testDb.insert(fileUploads).values({
            fileUploadId: imageFileUploadId,
            userId: user.userId,
            filename: 'meal.jpg',
            mediaType: 'image/jpeg',
            size: bytes.byteLength,
            bytes,
        });

        const result = await cookMealUpsert(
            cookMutationParent(user.userId),
            { meal: { title: 'Steak', imageFileUploadId } },
            requestingSession,
            serverRuntime,
        );

        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, result.referenceId!));
        expect(row!.imageFileUploadId).toBe(imageFileUploadId);
        expect(row!.publishedAt).not.toBeNull();
    });
});
