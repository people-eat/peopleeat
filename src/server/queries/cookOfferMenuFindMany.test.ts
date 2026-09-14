import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, menus } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookOfferMenuFindMany } from './cookOfferMenuFindMany';

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

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

async function insertOfferMenu(cookId: string, title: string, customerFirstName: string) {
    const customer = await commandSetup.withUser({ firstName: customerFirstName, lastName: 'User' });
    const bookingRequestId = idCreate();
    const dateTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime,
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
        cookId,
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
    await testDb.insert(menus).values({ menuId, cookId, bookingRequestOfferId: offerId, title, description: '' });
    return { menuId, offerId, dateTime, customerFirstName };
}

describe('cookOfferMenuFindMany', () => {
    it('returns offer-scoped menus with offerContext and excludes inventory menus', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const inventoryId = idCreate();
        await testDb.insert(menus).values({ menuId: inventoryId, cookId: user.userId, title: 'Library', description: '' });
        const offer = await insertOfferMenu(user.userId, 'Offer copy', 'Ada');

        // Act
        const rows = await cookOfferMenuFindMany(cookParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(rows.map((row) => row.menuId)).toEqual([offer.menuId]);
        expect(rows[0]).toMatchObject({
            title: 'Offer copy',
            bookingRequestOfferId: offer.offerId,
            offerContext: {
                bookingRequestOfferId: offer.offerId,
                customerFirstName: 'Ada',
                status: 'USER_NEEDS_TO_ACCEPT',
            },
        });
        expect(rows[0]!.offerContext!.bookingRequestDateTime.toISOString()).toBe(offer.dateTime.toISOString());
    });

    it('excludes soft-deleted offer menus', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const offer = await insertOfferMenu(user.userId, 'Deleted offer menu', 'Bob');
        await testDb.update(menus).set({ deletedAt: new Date() }).where(eq(menus.menuId, offer.menuId));

        // Act
        const rows = await cookOfferMenuFindMany(cookParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});
