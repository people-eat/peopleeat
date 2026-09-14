import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, meals } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookMealFindOne } from './adminCookMealFindOne';

describe('adminCookMealFindOne', () => {
    it('returns a meal including soft-deleted', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: setup.user.userId });
        const mealId = idCreate();
        await testDb.insert(meals).values({
            mealId,
            cookId: setup.user.userId,
            title: 'Soup',
            description: '',
        });

        const found = await adminCookMealFindOne({ mealId }, setup.requestingSession, setup.serverRuntime);
        expect(found?.title).toBe('Soup');
        expect(found?.cookId).toBe(setup.user.userId);
        expect(found?.imageFileUploadId).toBeNull();

        await testDb.update(meals).set({ deletedAt: new Date() }).where(eq(meals.mealId, mealId));
        const deleted = await adminCookMealFindOne({ mealId }, setup.requestingSession, setup.serverRuntime);
        expect(deleted?.deletedAt).not.toBeNull();

        const missing = await adminCookMealFindOne({ mealId: idCreate() }, setup.requestingSession, setup.serverRuntime);
        expect(missing).toBeNull();
    });
});
