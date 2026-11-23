import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { fileUploadPublicUrl } from '../../shared/contentSection';
import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequests,
    cooks,
    fileUploads,
    meals,
    menuCourseMealOptions,
    menuCourses,
    menus,
    users,
} from '../db/schema';
import type { BookingRequestOfferConfiguredMenu } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { userBookingRequestOfferConfiguredMenuCreate } from './userBookingRequestOfferConfiguredMenuCreate';

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

const sentinelConfiguredMenu = {
    menuId: 'sentinel-menu',
    title: 'Sentinel',
    description: 'Untouched',
    courses: [],
} satisfies BookingRequestOfferConfiguredMenu;

const menuTitle = 'Sunday lunch';
const menuDescription = 'Seasonal courses';

function expectNoOutbound(serverRuntime: ServerRuntime) {
    expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.email.send).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.cancel).not.toHaveBeenCalled();
}

async function readOffer(bookingRequestOfferId: string) {
    const [offer] = await testDb
        .select()
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
    const events = await testDb
        .select()
        .from(bookingRequestOfferEvents)
        .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId))
        .orderBy(asc(bookingRequestOfferEvents.bookingRequestOfferEventId));
    return { offer, events };
}

async function seedConfiguredOffer(options?: { userAccepted?: boolean | null; cookAccepted?: boolean | null; includeCourses?: boolean }) {
    const includeCourses = options?.includeCourses !== false;
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
    const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_menu',
        stripeAccountActive: true,
    });

    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date('2026-12-15T18:00:00.000Z'),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: options?.cookAccepted === undefined ? true : options.cookAccepted,
        userAccepted: options?.userAccepted === undefined ? null : options.userAccepted,
        userUnreadNotificationCount: 6,
        cookUnreadNotificationCount: 8,
        menuPriceCents: 40_000,
        travelExpensesCents: 2_000,
        paymentProviderFeeCents: 800,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 7_200,
        platformFeeCentsCustomer: 1_600,
        payoutCentsCook: 34_800,
        totalWithoutDiscountsCentsCustomer: 45_000,
        totalCentsCustomer: 45_000,
        giftCardAppliedCents: 0,
        paymentStatus: 'EMPTY',
        configuredMenu: sentinelConfiguredMenu,
        plannedPayoutDateTime: new Date('2026-12-01T12:00:00.000Z'),
    });

    const menuId = idCreate();
    await testDb.insert(menus).values({
        menuId,
        cookId: cook.user.userId,
        bookingRequestOfferId,
        title: menuTitle,
        description: menuDescription,
    });

    const imageFileUploadId = idCreate();
    const soupMealId = idCreate();
    const steakMealId = idCreate();
    const fishMealId = idCreate();
    const starterCourseId = idCreate();
    const mainCourseId = idCreate();

    if (includeCourses) {
        const bytes = Buffer.from('steak');
        await testDb.insert(fileUploads).values({
            fileUploadId: imageFileUploadId,
            userId: cook.user.userId,
            filename: 'steak.jpg',
            mediaType: 'image/jpeg',
            size: bytes.byteLength,
            bytes,
        });
        await testDb.insert(meals).values([
            { mealId: soupMealId, cookId: cook.user.userId, title: 'Soup', description: 'Tomato' },
            { mealId: steakMealId, cookId: cook.user.userId, title: 'Steak', description: 'Rare', imageFileUploadId },
            { mealId: fishMealId, cookId: cook.user.userId, title: 'Fish', description: 'Grilled' },
        ]);
        // Higher index first so a missing orderBy would surface Main before Starter.
        await testDb.insert(menuCourses).values([
            { courseId: mainCourseId, menuId, cookId: cook.user.userId, index: 1, title: 'Main', mealSelectionLimit: 2 },
            { courseId: starterCourseId, menuId, cookId: cook.user.userId, index: 0, title: 'Starter', mealSelectionLimit: null },
        ]);
        await testDb.insert(menuCourseMealOptions).values([
            { mealOptionId: idCreate(), courseId: mainCourseId, cookId: cook.user.userId, mealId: fishMealId, index: 0 },
            { mealOptionId: idCreate(), courseId: mainCourseId, cookId: cook.user.userId, mealId: steakMealId, index: 1 },
            { mealOptionId: idCreate(), courseId: starterCourseId, cookId: cook.user.userId, mealId: soupMealId, index: 0 },
        ]);
    }

    return {
        cook,
        customer,
        bookingRequestOfferId,
        menuId,
        imageFileUploadId,
        soupMealId,
        steakMealId,
        fishMealId,
        starterCourseId,
        mainCourseId,
    };
}

function validSelections(seed: Awaited<ReturnType<typeof seedConfiguredOffer>>) {
    return [
        { courseId: seed.mainCourseId, mealIds: [seed.steakMealId, seed.fishMealId] },
        { courseId: seed.starterCourseId, mealIds: [seed.soupMealId] },
        { courseId: idCreate(), mealIds: [idCreate()] },
    ];
}

describe('userBookingRequestOfferConfiguredMenuCreate', () => {
    it('stores the menu in course order, ignores unknown courses, and publishes', async () => {
        // Arrange
        const seed = await seedConfiguredOffer();
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act
        const result = await userBookingRequestOfferConfiguredMenuCreate(
            userMutationParent(seed.customer.user.userId),
            { bookingRequestOfferId: seed.bookingRequestOfferId, menuId: seed.menuId, courseSelections: validSelections(seed) },
            seed.customer.requestingSession,
            seed.customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: seed.bookingRequestOfferId });
        const { offer, events } = await readOffer(seed.bookingRequestOfferId);
        expect(offer?.configuredMenu).toEqual({
            menuId: seed.menuId,
            title: menuTitle,
            description: menuDescription,
            courses: [
                { title: 'Starter', meals: [{ mealId: seed.soupMealId, mealTitle: 'Soup', mealDescription: 'Tomato' }] },
                {
                    title: 'Main',
                    meals: [
                        {
                            mealId: seed.steakMealId,
                            mealTitle: 'Steak',
                            mealDescription: 'Rare',
                            mealImageUrl: fileUploadPublicUrl(seed.imageFileUploadId),
                        },
                        { mealId: seed.fishMealId, mealTitle: 'Fish', mealDescription: 'Grilled' },
                    ],
                },
            ],
        });
        expect(offer?.userUnreadNotificationCount).toBe(before.offer?.userUnreadNotificationCount);
        expect(offer?.cookUnreadNotificationCount).toBe(before.offer?.cookUnreadNotificationCount);
        expect(offer?.menuPriceCents).toBe(40_000);
        expect(events).toHaveLength(1);
        expect(events[0]?.type).toBe('USER_CONFIGURED_MENU');
        expect(events[0]?.payload).toEqual({});
        expect(seed.customer.serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(2);
        expect(seed.customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: seed.customer.user.userId });
        expect(seed.customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: seed.cook.user.userId });
        expect(seed.customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
        expect(seed.customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(seed.customer.serverRuntime.email.send).not.toHaveBeenCalled();
        expect(seed.customer.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(seed.customer.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('stores an empty course list when the menu has no courses', async () => {
        // Arrange
        const seed = await seedConfiguredOffer({ includeCourses: false });

        // Act
        const result = await userBookingRequestOfferConfiguredMenuCreate(
            userMutationParent(seed.customer.user.userId),
            {
                bookingRequestOfferId: seed.bookingRequestOfferId,
                menuId: seed.menuId,
                courseSelections: [{ courseId: idCreate(), mealIds: [] }],
            },
            seed.customer.requestingSession,
            seed.customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: seed.bookingRequestOfferId });
        const { offer, events } = await readOffer(seed.bookingRequestOfferId);
        expect(offer?.configuredMenu).toEqual({
            menuId: seed.menuId,
            title: menuTitle,
            description: menuDescription,
            courses: [],
        });
        expect(events[0]?.type).toBe('USER_CONFIGURED_MENU');
        expect(seed.customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: seed.cook.user.userId });
        expect(seed.customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(seed.customer.serverRuntime.email.send).not.toHaveBeenCalled();
        expect(seed.customer.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(seed.customer.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('throws when the offer does not exist and does not publish', async () => {
        // Arrange
        const seed = await seedConfiguredOffer();
        const before = await readOffer(seed.bookingRequestOfferId);
        const missingOfferId = idCreate();

        // Act + Assert
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                { bookingRequestOfferId: missingOfferId, menuId: seed.menuId, courseSelections: validSelections(seed) },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/offer or menu not found/);

        const logRows = await findLogsForSession(seed.customer.requestingSession.sessionId);
        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expect(logRows.some((row) => row.level === 'error' && /offer or menu not found/.test(row.message))).toBe(true);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws when the offer belongs to another customer and leaves the menu', async () => {
        // Arrange
        const seed = await seedConfiguredOffer();
        const other = await commandSetup.withUser({ firstName: 'Other', lastName: 'Host' });
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(other.user.userId),
                { bookingRequestOfferId: seed.bookingRequestOfferId, menuId: seed.menuId, courseSelections: validSelections(seed) },
                other.requestingSession,
                other.serverRuntime,
            ),
        ).rejects.toThrow(/offer or menu not found/);

        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expectNoOutbound(other.serverRuntime);
    });

    it('throws when the menu is not attached to the offer and leaves the snapshot', async () => {
        // Arrange
        const seed = await seedConfiguredOffer();
        const inventoryMenuId = idCreate();
        await testDb.insert(menus).values({
            menuId: inventoryMenuId,
            cookId: seed.cook.user.userId,
            title: 'Inventory',
            description: 'Not on the offer',
        });
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                { bookingRequestOfferId: seed.bookingRequestOfferId, menuId: inventoryMenuId, courseSelections: validSelections(seed) },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/offer or menu not found/);

        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws when the customer has already declined and leaves the snapshot', async () => {
        // Arrange
        const seed = await seedConfiguredOffer({ userAccepted: false, cookAccepted: true });
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                { bookingRequestOfferId: seed.bookingRequestOfferId, menuId: seed.menuId, courseSelections: validSelections(seed) },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/offer already declined/);

        const logRows = await findLogsForSession(seed.customer.requestingSession.sessionId);
        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expect(logRows.some((row) => row.level === 'error' && /offer already declined/.test(row.message))).toBe(true);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws when the cook has already declined and leaves the snapshot', async () => {
        // Arrange
        const seed = await seedConfiguredOffer({ userAccepted: null, cookAccepted: false });
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                { bookingRequestOfferId: seed.bookingRequestOfferId, menuId: seed.menuId, courseSelections: validSelections(seed) },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/offer already declined/);

        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws when the offer is already dual-accepted and leaves the snapshot', async () => {
        // Arrange
        const seed = await seedConfiguredOffer({ userAccepted: true, cookAccepted: true });
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                { bookingRequestOfferId: seed.bookingRequestOfferId, menuId: seed.menuId, courseSelections: validSelections(seed) },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/offer already accepted/);

        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws when a course is missing from the selection and leaves the snapshot', async () => {
        // Arrange
        const seed = await seedConfiguredOffer();
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert — starter is valid; main is absent, so the lookup falls back to [].
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                {
                    bookingRequestOfferId: seed.bookingRequestOfferId,
                    menuId: seed.menuId,
                    courseSelections: [{ courseId: seed.starterCourseId, mealIds: [seed.soupMealId] }],
                },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/invalid course selection/);

        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws when a course selection is explicitly empty and leaves the snapshot', async () => {
        // Arrange
        const seed = await seedConfiguredOffer();
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                {
                    bookingRequestOfferId: seed.bookingRequestOfferId,
                    menuId: seed.menuId,
                    courseSelections: [
                        { courseId: seed.starterCourseId, mealIds: [seed.soupMealId] },
                        { courseId: seed.mainCourseId, mealIds: [] },
                    ],
                },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/invalid course selection/);

        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws when a single-select course gets more than one meal', async () => {
        // Arrange — starter mealSelectionLimit is null, so the limit defaults to 1.
        const seed = await seedConfiguredOffer();
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                {
                    bookingRequestOfferId: seed.bookingRequestOfferId,
                    menuId: seed.menuId,
                    courseSelections: [{ courseId: seed.starterCourseId, mealIds: [seed.soupMealId, seed.fishMealId] }],
                },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/invalid course selection/);

        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws when a course selection repeats a meal and leaves the snapshot', async () => {
        // Arrange
        const seed = await seedConfiguredOffer();
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert — unique count is within the main-course limit, but it does not match the raw list.
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                {
                    bookingRequestOfferId: seed.bookingRequestOfferId,
                    menuId: seed.menuId,
                    courseSelections: [
                        { courseId: seed.starterCourseId, mealIds: [seed.soupMealId] },
                        { courseId: seed.mainCourseId, mealIds: [seed.steakMealId, seed.steakMealId] },
                    ],
                },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/invalid course selection/);

        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws when a selected meal is not an option of the course', async () => {
        // Arrange
        const seed = await seedConfiguredOffer();
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert — soup belongs to starter, not main.
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                {
                    bookingRequestOfferId: seed.bookingRequestOfferId,
                    menuId: seed.menuId,
                    courseSelections: [
                        { courseId: seed.starterCourseId, mealIds: [seed.soupMealId] },
                        { courseId: seed.mainCourseId, mealIds: [seed.soupMealId] },
                    ],
                },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/meal is not an option of this course/);

        const logRows = await findLogsForSession(seed.customer.requestingSession.sessionId);
        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expect(logRows.some((row) => row.level === 'error' && /meal is not an option of this course/.test(row.message))).toBe(true);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws when the customer is not active and leaves the snapshot', async () => {
        // Arrange
        const seed = await seedConfiguredOffer();
        await testDb.update(users).set({ status: 'BANNED' }).where(eq(users.userId, seed.customer.user.userId));
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(seed.customer.user.userId),
                { bookingRequestOfferId: seed.bookingRequestOfferId, menuId: seed.menuId, courseSelections: validSelections(seed) },
                seed.customer.requestingSession,
                seed.customer.serverRuntime,
            ),
        ).rejects.toThrow(/userBookingRequestOfferConfiguredMenuCreate: user is not active/);

        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expectNoOutbound(seed.customer.serverRuntime);
    });

    it('throws Unauthorized when the customer does not exist and leaves the snapshot', async () => {
        // Arrange
        const seed = await seedConfiguredOffer();
        const stranger = await commandSetup();
        const before = await readOffer(seed.bookingRequestOfferId);

        // Act + Assert
        await expect(
            userBookingRequestOfferConfiguredMenuCreate(
                userMutationParent(idCreate()),
                { bookingRequestOfferId: seed.bookingRequestOfferId, menuId: seed.menuId, courseSelections: validSelections(seed) },
                stranger.requestingSession,
                stranger.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(await readOffer(seed.bookingRequestOfferId)).toEqual(before);
        expectNoOutbound(stranger.serverRuntime);
    });
});
