import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, menus } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookMenuFindMany } from './cookMenuFindMany';

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

/** Insert an offer-scoped menu copy (bookingRequestOfferId set) for the given cook. */
async function insertOfferMenu(cookId: string) {
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
    await testDb.insert(menus).values({ menuId, cookId, bookingRequestOfferId: offerId, title: 'Offer menu', description: '' });
    return { menuId };
}

describe('cookMenuFindMany', () => {
    it('returns non-deleted inventory menus for the cook ordered by createdAt descending', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const older = idCreate();
        const newer = idCreate();
        await testDb.insert(menus).values({
            menuId: older,
            cookId: user.userId,
            title: 'Older menu',
            description: '',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
        });
        await testDb.insert(menus).values({
            menuId: newer,
            cookId: user.userId,
            title: 'Newer menu',
            description: '',
            createdAt: new Date('2024-02-01T00:00:00.000Z'),
        });

        // Act
        const rows = await cookMenuFindMany(cookParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(rows.map((row) => row.menuId)).toEqual([newer, older]);
    });

    it('excludes soft-deleted menus and offer-scoped menu copies', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const visible = idCreate();
        const deleted = idCreate();
        await testDb.insert(menus).values({ menuId: visible, cookId: user.userId, title: 'Visible', description: '' });
        await testDb.insert(menus).values({
            menuId: deleted,
            cookId: user.userId,
            title: 'Deleted',
            description: '',
            deletedAt: new Date(),
        });
        const { menuId: offerMenuId } = await insertOfferMenu(user.userId);

        // Act
        const rows = await cookMenuFindMany(cookParent(user.userId), requestingSession, serverRuntime);

        // Assert
        const menuIds = rows.map((row) => row.menuId);
        expect(menuIds).toEqual([visible]);
        expect(menuIds).not.toContain(deleted);
        expect(menuIds).not.toContain(offerMenuId);
    });
});
