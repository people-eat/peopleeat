import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, menuCourses, menus } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookMenuFindOne } from './adminCookMenuFindOne';

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

describe('adminCookMenuFindOne', () => {
    it('returns an inventory menu with courses, including soft-deleted', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: setup.user.userId });
        const menuId = idCreate();
        await testDb.insert(menus).values({
            menuId,
            cookId: setup.user.userId,
            title: 'Tasting',
            description: '',
        });
        await testDb.insert(menuCourses).values([
            { courseId: idCreate(), menuId, cookId: setup.user.userId, index: 0, title: 'Starter' },
            { courseId: idCreate(), menuId, cookId: setup.user.userId, index: 1, title: 'Main' },
            { courseId: idCreate(), menuId, cookId: setup.user.userId, index: 2, title: 'Dessert' },
        ]);

        const found = await adminCookMenuFindOne({ menuId }, setup.requestingSession, setup.serverRuntime);
        expect(found?.cookId).toBe(setup.user.userId);
        expect(found?.courses.length).toBe(3);
        expect(found?.courseCount).toBe(3);
        expect(found?.bookingRequestOfferId).toBeNull();

        await testDb.update(menus).set({ deletedAt: new Date() }).where(eq(menus.menuId, menuId));
        const deleted = await adminCookMenuFindOne({ menuId }, setup.requestingSession, setup.serverRuntime);
        expect(deleted?.deletedAt).not.toBeNull();
        expect(deleted?.courses.length).toBe(3);

        const missing = await adminCookMenuFindOne({ menuId: idCreate() }, setup.requestingSession, setup.serverRuntime);
        expect(missing).toBeNull();
    });

    it('returns offer-scoped copies for admin deep-links', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: setup.user.userId });
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Guest' });
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
            cookId: setup.user.userId,
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
        const offerMenuId = idCreate();
        await testDb.insert(menus).values({
            menuId: offerMenuId,
            cookId: setup.user.userId,
            title: 'Offer copy',
            description: '',
            bookingRequestOfferId: offerId,
        });

        const found = await adminCookMenuFindOne({ menuId: offerMenuId }, setup.requestingSession, setup.serverRuntime);
        expect(found?.title).toBe('Offer copy');
        expect(found?.bookingRequestOfferId).toBe(offerId);
    });
});
