import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { cooks, menuCourses, menus } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMenuCreate } from './cookMenuCreate';

async function setupCook(overrides?: Parameters<typeof commandSetup.withUser>[0]) {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User', ...overrides });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMenuCreate', () => {
    it('inserts a draft menu with three default German courses when the cook locale is de', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({ locale: 'de' });

        // Act
        const result = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();

        const [menu] = await testDb.select().from(menus).where(eq(menus.menuId, result.referenceId!));
        expect(menu!.cookId).toBe(user.userId);
        expect(menu!.title).toBe('Neues Menü');
        expect(menu!.description).toBe('');
        expect(menu!.publishedAt).toBeNull();
        expect(menu!.deletedAt).toBeNull();
        expect(menu!.bookingRequestOfferId).toBeNull();
        expect(menu!.copyOfMenuId).toBeNull();

        const courses = await testDb.select().from(menuCourses).where(eq(menuCourses.menuId, result.referenceId!));
        expect(courses).toHaveLength(3);
        expect(courses.sort((a, b) => a.index - b.index).map((c) => c.title)).toEqual(['Vorspeise', 'Hauptspeise', 'Dessert']);
        expect(courses.every((c) => c.cookId === user.userId)).toBe(true);
        expect(courses.every((c) => c.mealSelectionLimit === null)).toBe(true);

        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('inserts English draft title and course titles when the cook locale is en', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({ locale: 'en' });

        // Act
        const result = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(result.success).toBe(true);
        const [menu] = await testDb.select().from(menus).where(eq(menus.menuId, result.referenceId!));
        expect(menu!.title).toBe('New menu');

        const courses = await testDb.select().from(menuCourses).where(eq(menuCourses.menuId, result.referenceId!));
        expect(courses.sort((a, b) => a.index - b.index).map((c) => c.title)).toEqual(['Starter', 'Main course', 'Dessert']);
    });

    it('rejects when the cook row is missing and logs the error', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'not-a-cook', lastName: 'User' });

        // Act + Assert
        await expect(cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime)).rejects.toThrow();

        const [menuRows, logRows] = await Promise.all([
            testDb.select().from(menus).where(eq(menus.cookId, user.userId)),
            findLogsForSession(requestingSession.sessionId),
        ]);
        expect(menuRows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows.some((row) => row.level === 'error')).toBe(true);
    });
});
