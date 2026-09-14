import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, cooks, meals } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookMealCreate } from './adminCookMealCreate';

describe('adminCookMealCreate', () => {
    it('creates a draft meal for the cook', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Meal', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });

        const result = await adminCookMealCreate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, meal: { title: 'risotto' } },
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
});
