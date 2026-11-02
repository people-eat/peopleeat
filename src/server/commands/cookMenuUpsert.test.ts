import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMealUpsert } from './cookMealUpsert';
import { cookMenuDelete } from './cookMenuDelete';
import { cookMenuUpsert } from './cookMenuUpsert';

const berlin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

async function setupCook(overrides?: Parameters<typeof commandSetup.withUser>[0]) {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User', ...overrides });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMenuUpsert', () => {
    it('inserts a draft menu with three default German courses when the cook locale is de', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({ locale: 'de' });

        // Act
        const result = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

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
        const result = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

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
        await expect(cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime)).rejects.toThrow();

        const [menuRows, logRows] = await Promise.all([
            testDb.select().from(menus).where(eq(menus.cookId, user.userId)),
            findLogsForSession(requestingSession.sessionId),
        ]);
        expect(menuRows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows.some((row) => row.level === 'error')).toBe(true);
    });

    it('applies title and description with capitalization and publishes', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act
        const result = await cookMenuUpsert(
            cookMutationParent(user.userId),
            { menu: { menuId: created.referenceId!, title: '  summer tasting  ', description: '  light courses  ' } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: created.referenceId });
        const [row] = await testDb.select().from(menus).where(eq(menus.menuId, created.referenceId!));
        expect(row!.title).toBe('Summer tasting');
        expect(row!.description).toBe('Light courses');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('publishes and unpublishes via publishedAt', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const menuId = created.referenceId!;
        const publishedAt = new Date('2026-01-15T12:00:00.000Z');

        // Act — publish
        await cookMenuUpsert(cookMutationParent(user.userId), { menu: { menuId, publishedAt } }, requestingSession, serverRuntime);
        const [published] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(published!.publishedAt?.toISOString()).toBe(publishedAt.toISOString());

        // Act — unpublish
        await cookMenuUpsert(cookMutationParent(user.userId), { menu: { menuId, publishedAt: null } }, requestingSession, serverRuntime);
        const [unpublished] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(unpublished!.publishedAt).toBeNull();
    });

    it('replaces courses and meal options atomically', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const mealA = await cookMealUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const mealB = await cookMealUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const menuId = created.referenceId!;
        const defaultCourses = await testDb.select().from(menuCourses).where(eq(menuCourses.menuId, menuId));
        expect(defaultCourses).toHaveLength(3);

        // Act
        await cookMenuUpsert(
            cookMutationParent(user.userId),
            {
                menu: {
                    menuId,
                    courses: [
                        { title: '  amuse  ', mealIds: [mealA.referenceId!], mealSelectionLimit: null },
                        {
                            title: 'Haupt',
                            mealIds: [mealA.referenceId!, mealB.referenceId!],
                            mealSelectionLimit: 2,
                        },
                    ],
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert — default courses gone; new courses + options present.
        const courses = await testDb.select().from(menuCourses).where(eq(menuCourses.menuId, menuId));
        expect(courses).toHaveLength(2);
        expect(courses.sort((a, b) => a.index - b.index).map((c) => c.title)).toEqual(['Amuse', 'Haupt']);
        expect(courses.find((c) => c.title === 'Haupt')!.mealSelectionLimit).toBe(2);

        const options = await testDb.select().from(menuCourseMealOptions).where(eq(menuCourseMealOptions.cookId, user.userId));
        const courseIds = new Set(courses.map((c) => c.courseId));
        const forMenu = options.filter((o) => courseIds.has(o.courseId));
        expect(forMenu).toHaveLength(3);
        expect(forMenu.map((o) => o.mealId).sort()).toEqual([mealA.referenceId!, mealA.referenceId!, mealB.referenceId!].sort());
    });

    it('rejects an empty patch', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act + Assert
        await expect(
            cookMenuUpsert(cookMutationParent(user.userId), { menu: { menuId: created.referenceId! } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/at least one field is required/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error')).toBe(true);
    });

    it('rejects an empty title', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act + Assert
        await expect(
            cookMenuUpsert(
                cookMutationParent(user.userId),
                { menu: { menuId: created.referenceId!, title: '   ' } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/title must not be empty/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects invalid publishedAt', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        // Act + Assert
        await expect(
            cookMenuUpsert(
                cookMutationParent(user.userId),
                { menu: { menuId: created.referenceId!, publishedAt: 'not-a-date' as unknown as Date } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/publishedAt is invalid/);
    });

    it('rejects courses with no courses array items', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        // Act + Assert
        await expect(
            cookMenuUpsert(
                cookMutationParent(user.userId),
                { menu: { menuId: created.referenceId!, courses: [] } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/at least one course/);
    });

    it('rejects a course with an empty title', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);

        // Act + Assert
        await expect(
            cookMenuUpsert(
                cookMutationParent(user.userId),
                { menu: { menuId: created.referenceId!, courses: [{ title: '  ', mealIds: [], mealSelectionLimit: null }] } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/each course needs a title/);
    });

    it('rejects meal ids not owned by the cook', async () => {
        // Arrange
        const owner = await setupCook();
        const other = await setupCook();
        const menu = await cookMenuUpsert(cookMutationParent(owner.user.userId), {}, owner.requestingSession, owner.serverRuntime);
        const foreignMeal = await cookMealUpsert(cookMutationParent(other.user.userId), {}, other.requestingSession, other.serverRuntime);
        vi.mocked(owner.serverRuntime.publish.userUpdates).mockClear();

        // Act + Assert
        await expect(
            cookMenuUpsert(
                cookMutationParent(owner.user.userId),
                {
                    menu: {
                        menuId: menu.referenceId!,
                        courses: [{ title: 'Main', mealIds: [foreignMeal.referenceId!], mealSelectionLimit: null }],
                    },
                },
                owner.requestingSession,
                owner.serverRuntime,
            ),
        ).rejects.toThrow(/meals are missing or deleted/);

        expect(owner.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects updates on soft-deleted menus', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        await cookMenuDelete(cookMutationParent(user.userId), { menuId: created.referenceId! }, requestingSession, serverRuntime);
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act + Assert
        await expect(
            cookMenuUpsert(
                cookMutationParent(user.userId),
                { menu: { menuId: created.referenceId!, title: 'Gone' } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/menu not found/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('updates offer-scoped menus while the offer is negotiable', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const customer = await commandSetup.withUser({ firstName: 'customer', lastName: 'User' });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Hi',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        const offerId = idCreate();
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: offerId,
            bookingRequestId,
            cookId: user.userId,
            cookAccepted: true,
            userAccepted: null,
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 0,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 0,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 23_000,
            paymentStatus: 'EMPTY',
        });
        const menuId = idCreate();
        await testDb.insert(menus).values({
            menuId,
            cookId: user.userId,
            bookingRequestOfferId: offerId,
            title: 'Offer menu',
            description: '',
        });
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act
        const result = await cookMenuUpsert(
            cookMutationParent(user.userId),
            { menu: { menuId, title: '  customized tasting  ' } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: menuId });
        const [row] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(row!.title).toBe('Customized tasting');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects publishedAt changes on offer-scoped menus', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const customer = await commandSetup.withUser({ firstName: 'customer', lastName: 'User' });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Hi',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        const offerId = idCreate();
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: offerId,
            bookingRequestId,
            cookId: user.userId,
            cookAccepted: true,
            userAccepted: null,
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 0,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 0,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 23_000,
            paymentStatus: 'EMPTY',
        });
        const menuId = idCreate();
        await testDb.insert(menus).values({
            menuId,
            cookId: user.userId,
            bookingRequestOfferId: offerId,
            title: 'Offer menu',
            description: '',
        });
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act + Assert
        await expect(
            cookMenuUpsert(
                cookMutationParent(user.userId),
                { menu: { menuId, publishedAt: new Date() } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/publishedAt is inventory-only/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('clears description to empty string when whitespace-only', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuUpsert(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        await cookMenuUpsert(
            cookMutationParent(user.userId),
            { menu: { menuId: created.referenceId!, description: 'Something' } },
            requestingSession,
            serverRuntime,
        );

        // Act
        await cookMenuUpsert(
            cookMutationParent(user.userId),
            { menu: { menuId: created.referenceId!, description: '   ' } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(menus).where(eq(menus.menuId, created.referenceId!));
        expect(row!.description).toBe('');
    });
});
