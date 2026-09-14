import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, cooks, menuCourses, menus } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookMenuCreate } from './adminCookMenuCreate';

describe('adminCookMenuCreate', () => {
    it('creates a draft menu with three courses in the cook locale', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Menu', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook', locale: 'en' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });

        const result = await adminCookMenuCreate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        const [menu] = await testDb.select().from(menus).where(eq(menus.menuId, result.referenceId!));
        expect(menu?.title).toBe('New menu');
        expect(menu?.publishedAt).toBeNull();
        const courses = await testDb.select().from(menuCourses).where(eq(menuCourses.menuId, result.referenceId!));
        expect(courses).toHaveLength(3);
        expect(courses.sort((a, b) => a.index - b.index).map((c) => c.title)).toEqual(['Starter', 'Main course', 'Dessert']);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });
});
