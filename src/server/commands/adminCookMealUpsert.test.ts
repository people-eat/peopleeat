import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, cooks, meals } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookMealDelete } from './adminCookMealDelete';
import { adminCookMealUpsert } from './adminCookMealUpsert';

describe('adminCookMealUpsert', () => {
    it('creates a draft meal for the cook', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Meal', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });

        const result = await adminCookMealUpsert(
            adminMutationParent(admin.user.userId),
            { meal: { cookId: cookUser.user.userId, title: 'risotto' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, result.referenceId!));
        expect(row?.title).toBe('Risotto');
        expect(row?.cookId).toBe(cookUser.user.userId);
        expect(row?.publishedAt).toBeNull();
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects create without cookId', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Meal', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminCookMealUpsert(
                adminMutationParent(admin.user.userId),
                { meal: { title: 'Soup' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/cookId is required/);
    });

    it('patches title and publishes for another cook', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Meal', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });

        const created = await adminCookMealUpsert(
            adminMutationParent(admin.user.userId),
            { meal: { cookId: cookUser.user.userId } },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const mealId = created.referenceId!;

        const result = await adminCookMealUpsert(
            adminMutationParent(admin.user.userId),
            { meal: { mealId, title: '  tomato soup  ', publishedAt: new Date() } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: mealId });
        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, mealId));
        expect(row?.title).toBe('Tomato soup');
        expect(row?.publishedAt).not.toBeNull();
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookUser.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('refuses updates on soft-deleted meals', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Meal', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });

        const created = await adminCookMealUpsert(
            adminMutationParent(admin.user.userId),
            { meal: { cookId: cookUser.user.userId } },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const mealId = created.referenceId!;
        await adminCookMealDelete(adminMutationParent(admin.user.userId), { mealId }, admin.requestingSession, admin.serverRuntime);

        await expect(
            adminCookMealUpsert(
                adminMutationParent(admin.user.userId),
                { meal: { mealId, title: 'Gone' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/meal not found/);
    });
});

describe('adminCookMealDelete', () => {
    it('soft-deletes the meal', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Meal', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });

        const created = await adminCookMealUpsert(
            adminMutationParent(admin.user.userId),
            { meal: { cookId: cookUser.user.userId } },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const mealId = created.referenceId!;

        const result = await adminCookMealDelete(
            adminMutationParent(admin.user.userId),
            { mealId },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result).toEqual({ success: true, referenceId: mealId });

        const [row] = await testDb.select().from(meals).where(eq(meals.mealId, mealId));
        expect(row?.deletedAt).not.toBeNull();
    });
});
