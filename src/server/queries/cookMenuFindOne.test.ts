import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, menus } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookMenuFindOne } from './cookMenuFindOne';

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

describe('cookMenuFindOne', () => {
    it('returns the mapped menu with hydrated courses on a hit', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const menuId = idCreate();
        await testDb.insert(menus).values({ menuId, cookId: user.userId, title: 'Tasting menu', description: 'Five courses' });

        // Act
        const row = await cookMenuFindOne(cookParent(user.userId), { menuId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({ menuId, title: 'Tasting menu', description: 'Five courses', courses: [] });
    });

    it('returns null when the menu id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act
        const row = await cookMenuFindOne(cookParent(user.userId), { menuId: idCreate() }, requestingSession, serverRuntime);

        // Assert
        expect(row).toBeNull();
    });

    it('returns null for a soft-deleted menu', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const menuId = idCreate();
        await testDb.insert(menus).values({
            menuId,
            cookId: user.userId,
            title: 'Gone menu',
            description: '',
            deletedAt: new Date(),
        });

        // Act
        const row = await cookMenuFindOne(cookParent(user.userId), { menuId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toBeNull();
    });

    it('returns an offer-scoped menu copy with offerContext', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'User' });
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
        await testDb
            .insert(menus)
            .values({ menuId, cookId: user.userId, bookingRequestOfferId: offerId, title: 'Offer menu', description: '' });

        // Act
        const row = await cookMenuFindOne(cookParent(user.userId), { menuId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            menuId,
            title: 'Offer menu',
            bookingRequestOfferId: offerId,
            offerContext: {
                bookingRequestOfferId: offerId,
                customerFirstName: 'Ada',
                status: 'USER_NEEDS_TO_ACCEPT',
            },
        });
        expect(row?.offerContext?.bookingRequestDateTime.toISOString()).toBe(dateTime.toISOString());
    });
});
