import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMealCreate } from './cookMealCreate';
import { cookMenuCopy } from './cookMenuCopy';
import { cookMenuCreate } from './cookMenuCreate';
import { cookMenuUpdate } from './cookMenuUpdate';

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMenuCopy', () => {
    it('deep-copies an inventory menu with courses and meal options', async () => {
        // Arrange — create menu, meal, then attach meal to a course via update.
        const { serverRuntime, requestingSession, user } = await setupCook();
        const menu = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        const meal = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        await cookMenuUpdate(
            cookMutationParent(user.userId),
            {
                menuId: menu.referenceId!,
                menu: {
                    title: 'Copied source',
                    description: 'Source description',
                    courses: [
                        { title: 'Starter', mealIds: [meal.referenceId!], mealSelectionLimit: null },
                        { title: 'Main', mealIds: [], mealSelectionLimit: null },
                    ],
                },
            },
            requestingSession,
            serverRuntime,
        );
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act
        const result = await cookMenuCopy(cookMutationParent(user.userId), { menuId: menu.referenceId! }, requestingSession, serverRuntime);

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        expect(result.referenceId).not.toBe(menu.referenceId);

        const [copy] = await testDb.select().from(menus).where(eq(menus.menuId, result.referenceId!));
        expect(copy!.cookId).toBe(user.userId);
        expect(copy!.copyOfMenuId).toBe(menu.referenceId);
        expect(copy!.bookingRequestOfferId).toBeNull();
        expect(copy!.title).toBe('Copied source');
        expect(copy!.description).toBe('Source description');
        expect(copy!.publishedAt).toBeNull();
        expect(copy!.deletedAt).toBeNull();

        const copyCourses = await testDb.select().from(menuCourses).where(eq(menuCourses.menuId, result.referenceId!));
        expect(copyCourses).toHaveLength(2);
        expect(copyCourses.map((c) => c.title).sort()).toEqual(['Main', 'Starter']);

        const copyOptions = await testDb.select().from(menuCourseMealOptions).where(eq(menuCourseMealOptions.cookId, user.userId));
        const optionsForCopy = copyOptions.filter((o) => copyCourses.some((c) => c.courseId === o.courseId));
        expect(optionsForCopy).toHaveLength(1);
        expect(optionsForCopy[0]!.mealId).toBe(meal.referenceId);

        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects a missing menu without publishing', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const missingId = idCreate();

        // Act + Assert
        await expect(
            cookMenuCopy(cookMutationParent(user.userId), { menuId: missingId }, requestingSession, serverRuntime),
        ).rejects.toThrow(/menu not found/);

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows.some((row) => row.level === 'error' && /menu not found/.test(row.message))).toBe(true);
    });

    it('rejects a soft-deleted source menu', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const menu = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        await testDb.update(menus).set({ deletedAt: new Date() }).where(eq(menus.menuId, menu.referenceId!));
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act + Assert
        await expect(
            cookMenuCopy(cookMutationParent(user.userId), { menuId: menu.referenceId! }, requestingSession, serverRuntime),
        ).rejects.toThrow(/menu not found/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects a menu owned by another cook', async () => {
        // Arrange
        const owner = await setupCook();
        const other = await setupCook();
        const menu = await cookMenuCreate(cookMutationParent(owner.user.userId), owner.requestingSession, owner.serverRuntime);

        // Act + Assert
        await expect(
            cookMenuCopy(
                cookMutationParent(other.user.userId),
                { menuId: menu.referenceId! },
                other.requestingSession,
                other.serverRuntime,
            ),
        ).rejects.toThrow(/menu not found/);

        expect(other.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
