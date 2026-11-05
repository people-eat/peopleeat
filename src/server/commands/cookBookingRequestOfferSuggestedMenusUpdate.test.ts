import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequests,
    cooks,
    meals,
    menuCourseMealOptions,
    menuCourses,
    menus,
    users,
} from '../db/schema';
import { bookingRequestReactionReminder } from '../jobs/handlers/bookingRequestReactionReminder';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookBookingRequestOfferSuggestedMenusUpdate } from './cookBookingRequestOfferSuggestedMenusUpdate';

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

const publishedAt = new Date('2030-01-02T00:00:00.000Z');

async function seedOpenOffer(options?: { userAccepted?: boolean | null; cookAccepted?: boolean | null }) {
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Offer' });
    const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId });
    cook.serverRuntime.slack.channels.bookingRequests = 'C-booking';

    const mealId = idCreate();
    await testDb.insert(meals).values({
        mealId,
        cookId: cook.user.userId,
        title: 'Tomatensuppe',
        description: 'Tomaten',
    });

    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date('2030-06-15T18:00:00.000Z'),
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
        userUnreadNotificationCount: 2,
        userRequestedMenuAdjustments: true,
        menuPriceCents: 20_000,
        travelExpensesCents: 2_000,
        paymentProviderFeeCents: 800,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 3_600,
        platformFeeCentsCustomer: 800,
        payoutCentsCook: 18_400,
        totalWithoutDiscountsCentsCustomer: 22_800,
        totalCentsCustomer: 22_800,
    });

    return { cook, customer, mealId, bookingRequestId, bookingRequestOfferId };
}

async function seedInventoryMenu(
    cookId: string,
    title: string,
    mealId: string,
    extras?: { deletedAt?: Date; bookingRequestOfferId?: string },
) {
    const menuId = idCreate();
    await testDb.insert(menus).values({
        menuId,
        cookId,
        title,
        description: `${title} description`,
        publishedAt,
        deletedAt: extras?.deletedAt ?? null,
        bookingRequestOfferId: extras?.bookingRequestOfferId ?? null,
    });
    if (!extras?.bookingRequestOfferId) {
        const courseId = idCreate();
        await testDb.insert(menuCourses).values({
            courseId,
            menuId,
            cookId,
            index: 0,
            title: 'Hauptgang',
        });
        await testDb.insert(menuCourseMealOptions).values({
            mealOptionId: idCreate(),
            courseId,
            cookId,
            mealId,
            index: 0,
        });
    }
    return menuId;
}

async function seedOfferCopy(cookId: string, bookingRequestOfferId: string, sourceMenuId: string, title: string) {
    const menuId = idCreate();
    await testDb.insert(menus).values({
        menuId,
        cookId,
        bookingRequestOfferId,
        copyOfMenuId: sourceMenuId,
        title,
        description: `${title} description`,
        publishedAt,
    });
    return menuId;
}

type OfferRuntime = Awaited<ReturnType<typeof commandSetup.withUser>>['serverRuntime'];

async function expectOfferUntouched(serverRuntime: OfferRuntime, bookingRequestOfferId: string) {
    const [offer] = await testDb
        .select()
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
    expect(offer?.userUnreadNotificationCount).toBe(2);
    expect(offer?.userRequestedMenuAdjustments).toBe(true);
    const events = await testDb
        .select()
        .from(bookingRequestOfferEvents)
        .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId));
    expect(events).toHaveLength(0);
    expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.email.send).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
}

function expectSuggestedMenusNotified(
    serverRuntime: OfferRuntime,
    args: {
        cookId: string;
        customerId: string;
        customerEmail: string | null;
        bookingRequestId: string;
        bookingRequestOfferId: string;
    },
) {
    expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: args.cookId });
    expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: args.customerId });
    expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(2);
    expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    expect(serverRuntime.email.send).toHaveBeenCalledWith(
        expect.objectContaining({
            to: args.customerEmail,
            purpose: 'BOOKING_REQUEST_OFFER_MENU_UPDATED',
            userId: args.customerId,
            relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        }),
    );
    expect(serverRuntime.whatsapp.sendTemplate).not.toHaveBeenCalled();
    expect(serverRuntime.slack.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
            channel: 'C-booking',
            text: expect.stringContaining('Chef Offer'),
        }),
    );
    expect(serverRuntime.jobs.enqueue).toHaveBeenCalledWith(
        bookingRequestReactionReminder,
        { bookingRequestId: args.bookingRequestId },
        { startAfter: expect.any(Date) },
    );
    const reminderCall = vi.mocked(serverRuntime.jobs.enqueue).mock.calls.find((call) => call[0] === bookingRequestReactionReminder);
    const startAfter = (reminderCall?.[2] as { startAfter: Date }).startAfter;
    expect(startAfter.getTime()).toBeGreaterThan(Date.now() + 47 * 60 * 60 * 1000);
    expect(startAfter.getTime()).toBeLessThan(Date.now() + 49 * 60 * 60 * 1000);
}

describe('cookBookingRequestOfferSuggestedMenusUpdate', () => {
    it('copies added menus, removes dropped copies, and notifies the customer', async () => {
        // Arrange
        const seeded = await seedOpenOffer();
        const summerId = await seedInventoryMenu(seeded.cook.user.userId, 'Summer', seeded.mealId);
        const winterId = await seedInventoryMenu(seeded.cook.user.userId, 'Winter', seeded.mealId);
        const oldCopyId = await seedOfferCopy(seeded.cook.user.userId, seeded.bookingRequestOfferId, summerId, 'Summer');

        // Act
        const result = await cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [winterId] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: seeded.bookingRequestOfferId });
        const [removed] = await testDb.select().from(menus).where(eq(menus.menuId, oldCopyId));
        expect(removed).toBeUndefined();

        const copies = await testDb.select().from(menus).where(eq(menus.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(copies).toHaveLength(1);
        expect(copies[0]!.copyOfMenuId).toBe(winterId);
        expect(copies[0]!.title).toBe('Winter');
        expect(copies[0]!.description).toBe('Winter description');
        expect(copies[0]!.publishedAt).toEqual(publishedAt);
        expect(copies[0]!.deletedAt).toBeNull();

        const courses = await testDb.select().from(menuCourses).where(eq(menuCourses.menuId, copies[0]!.menuId));
        expect(courses).toHaveLength(1);
        expect(courses[0]!.title).toBe('Hauptgang');
        expect(courses[0]!.index).toBe(0);
        const options = await testDb.select().from(menuCourseMealOptions).where(eq(menuCourseMealOptions.courseId, courses[0]!.courseId));
        expect(options).toHaveLength(1);
        expect(options[0]!.mealId).toBe(seeded.mealId);

        const [source] = await testDb.select().from(menus).where(eq(menus.menuId, winterId));
        expect(source!.bookingRequestOfferId).toBeNull();

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(offer!.userUnreadNotificationCount).toBe(3);
        expect(offer!.userRequestedMenuAdjustments).toBe(false);

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(events).toHaveLength(1);
        expect(events[0]!.type).toBe('COOK_UPDATED_SUGGESTED_MENU');
        expect(events[0]!.payload).toEqual({ menuTitlesBefore: ['Summer'], menuTitlesAfter: ['Winter'] });

        expectSuggestedMenusNotified(seeded.cook.serverRuntime, {
            cookId: seeded.cook.user.userId,
            customerId: seeded.customer.user.userId,
            customerEmail: seeded.customer.user.emailAddress,
            bookingRequestId: seeded.bookingRequestId,
            bookingRequestOfferId: seeded.bookingRequestOfferId,
        });
    });

    it('clears copied menus and leaves offer menus that are not copies', async () => {
        // Arrange
        const seeded = await seedOpenOffer();
        const summerId = await seedInventoryMenu(seeded.cook.user.userId, 'Summer', seeded.mealId);
        const copyId = await seedOfferCopy(seeded.cook.user.userId, seeded.bookingRequestOfferId, summerId, 'Copied summer');
        const nativeId = idCreate();
        await testDb.insert(menus).values({
            menuId: nativeId,
            cookId: seeded.cook.user.userId,
            bookingRequestOfferId: seeded.bookingRequestOfferId,
            title: 'Native offer',
            description: 'Created on the offer',
        });

        // Act
        const result = await cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const [copy] = await testDb.select().from(menus).where(eq(menus.menuId, copyId));
        expect(copy).toBeUndefined();
        const [native] = await testDb.select().from(menus).where(eq(menus.menuId, nativeId));
        expect(native?.copyOfMenuId).toBeNull();
        expect(native?.bookingRequestOfferId).toBe(seeded.bookingRequestOfferId);

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(events).toHaveLength(1);
        const payload = events[0]!.payload as { menuTitlesBefore?: string[]; menuTitlesAfter?: string[] };
        expect([...(payload.menuTitlesBefore ?? [])].sort()).toEqual(['Copied summer', 'Native offer']);
        expect(payload.menuTitlesAfter).toEqual([]);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(offer!.userUnreadNotificationCount).toBe(3);
        expect(offer!.userRequestedMenuAdjustments).toBe(false);
        expectSuggestedMenusNotified(seeded.cook.serverRuntime, {
            cookId: seeded.cook.user.userId,
            customerId: seeded.customer.user.userId,
            customerEmail: seeded.customer.user.emailAddress,
            bookingRequestId: seeded.bookingRequestId,
            bookingRequestOfferId: seeded.bookingRequestOfferId,
        });
    });

    it('dedupes repeated menu ids into one copy', async () => {
        // Arrange
        const seeded = await seedOpenOffer();
        const summerId = await seedInventoryMenu(seeded.cook.user.userId, 'Summer', seeded.mealId);

        // Act
        const result = await cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [summerId, summerId] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const copies = await testDb.select().from(menus).where(eq(menus.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(copies).toHaveLength(1);
        expect(copies[0]!.copyOfMenuId).toBe(summerId);
        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(events[0]!.payload).toEqual({ menuTitlesBefore: [], menuTitlesAfter: ['Summer'] });
    });

    it('still notifies when the suggested menus are unchanged', async () => {
        // Arrange
        const seeded = await seedOpenOffer();
        const summerId = await seedInventoryMenu(seeded.cook.user.userId, 'Summer', seeded.mealId);
        const copyId = await seedOfferCopy(seeded.cook.user.userId, seeded.bookingRequestOfferId, summerId, 'Summer');

        // Act
        const result = await cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [summerId] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const copies = await testDb.select().from(menus).where(eq(menus.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(copies).toHaveLength(1);
        expect(copies[0]!.menuId).toBe(copyId);
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(offer!.userUnreadNotificationCount).toBe(3);
        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(events[0]!.payload).toEqual({ menuTitlesBefore: ['Summer'], menuTitlesAfter: ['Summer'] });
        expect(seeded.cook.serverRuntime.email.send).toHaveBeenCalledOnce();
    });

    it('rejects when the cook is not active and leaves the offer unchanged', async () => {
        // Arrange
        const seeded = await seedOpenOffer();
        await testDb.update(users).set({ status: 'BANNED' }).where(eq(users.userId, seeded.cook.user.userId));

        // Act
        const pending = cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/user is not active/);
        await expectOfferUntouched(seeded.cook.serverRuntime, seeded.bookingRequestOfferId);
        const logs = await findLogsForSession(seeded.cook.requestingSession.sessionId);
        expect(logs.filter((row) => row.level === 'error')).toHaveLength(0);
    });

    it('rejects when the offer is missing', async () => {
        // Arrange
        const seeded = await seedOpenOffer();

        // Act
        const pending = cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: idCreate(), suggestedMenuIds: [] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/offer not found/);
        await expectOfferUntouched(seeded.cook.serverRuntime, seeded.bookingRequestOfferId);
        const logs = await findLogsForSession(seeded.cook.requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('offer not found'))).toBe(true);
    });

    it('rejects another cook reading this offer', async () => {
        // Arrange
        const seeded = await seedOpenOffer();
        const other = await commandSetup.withUser({ firstName: 'Other', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: other.user.userId });

        // Act
        const pending = cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(other.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [] } },
            other.requestingSession,
            other.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/offer not found/);
        await expectOfferUntouched(other.serverRuntime, seeded.bookingRequestOfferId);
        const logs = await findLogsForSession(other.requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('offer not found'))).toBe(true);
    });

    it('rejects when the offer is already declined', async () => {
        // Arrange
        const seeded = await seedOpenOffer({ userAccepted: false, cookAccepted: true });

        // Act
        const pending = cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/offer already declined/);
        await expectOfferUntouched(seeded.cook.serverRuntime, seeded.bookingRequestOfferId);
        const logs = await findLogsForSession(seeded.cook.requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('offer already declined'))).toBe(true);
    });

    it('rejects when both sides have already accepted', async () => {
        // Arrange
        const seeded = await seedOpenOffer({ userAccepted: true, cookAccepted: true });

        // Act
        const pending = cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/offer already accepted/);
        await expectOfferUntouched(seeded.cook.serverRuntime, seeded.bookingRequestOfferId);
        const logs = await findLogsForSession(seeded.cook.requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('offer already accepted'))).toBe(true);
    });

    it('rejects a menu id that does not exist', async () => {
        // Arrange
        const seeded = await seedOpenOffer();

        // Act
        const pending = cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [idCreate()] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/one or more menus not found/);
        await expectOfferUntouched(seeded.cook.serverRuntime, seeded.bookingRequestOfferId);
    });

    it('rejects a soft-deleted inventory menu', async () => {
        // Arrange
        const seeded = await seedOpenOffer();
        const menuId = await seedInventoryMenu(seeded.cook.user.userId, 'Gone', seeded.mealId, { deletedAt: new Date() });

        // Act
        const pending = cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [menuId] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/one or more menus not found/);
        const [menu] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(menu?.deletedAt).toBeTruthy();
        await expectOfferUntouched(seeded.cook.serverRuntime, seeded.bookingRequestOfferId);
    });

    it('rejects an offer-scoped menu id', async () => {
        // Arrange
        const seeded = await seedOpenOffer();
        const menuId = await seedInventoryMenu(seeded.cook.user.userId, 'On offer', seeded.mealId, {
            bookingRequestOfferId: seeded.bookingRequestOfferId,
        });

        // Act
        const pending = cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [menuId] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/one or more menus not found/);
        const [menu] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(menu?.bookingRequestOfferId).toBe(seeded.bookingRequestOfferId);
        await expectOfferUntouched(seeded.cook.serverRuntime, seeded.bookingRequestOfferId);
    });

    it('rejects a menu owned by another cook', async () => {
        // Arrange
        const seeded = await seedOpenOffer();
        const other = await commandSetup.withUser({ firstName: 'Other', lastName: 'Menu' });
        await testDb.insert(cooks).values({ cookId: other.user.userId });
        const otherMealId = idCreate();
        await testDb.insert(meals).values({
            mealId: otherMealId,
            cookId: other.user.userId,
            title: 'Fremde Suppe',
            description: 'Nicht meine',
        });
        const otherMenuId = await seedInventoryMenu(other.user.userId, 'Other menu', otherMealId);

        // Act
        const pending = cookBookingRequestOfferSuggestedMenusUpdate(
            cookMutationParent(seeded.cook.user.userId),
            { input: { bookingRequestOfferId: seeded.bookingRequestOfferId, suggestedMenuIds: [otherMenuId] } },
            seeded.cook.requestingSession,
            seeded.cook.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/one or more menus not found/);
        const [menu] = await testDb.select().from(menus).where(eq(menus.menuId, otherMenuId));
        expect(menu?.cookId).toBe(other.user.userId);
        expect(menu?.bookingRequestOfferId).toBeNull();
        await expectOfferUntouched(seeded.cook.serverRuntime, seeded.bookingRequestOfferId);
        const logs = await findLogsForSession(seeded.cook.requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('one or more menus not found'))).toBe(true);
    });
});
