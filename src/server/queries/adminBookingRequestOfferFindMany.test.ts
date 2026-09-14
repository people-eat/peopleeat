import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferFindMany } from './adminBookingRequestOfferFindMany';

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

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

async function insertOffer(cookId: string, createdAt?: Date) {
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
    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
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
        ...(createdAt ? { createdAt } : {}),
    });
    return { bookingRequestOfferId, bookingRequestId };
}

describe('adminBookingRequestOfferFindMany', () => {
    it('filters by cookIds', async () => {
        // Arrange
        const cookA = await setupCook();
        const cookB = await setupCook();
        const { bookingRequestOfferId } = await insertOffer(cookA.user.userId);
        await insertOffer(cookB.user.userId);

        // Act
        const rows = await adminBookingRequestOfferFindMany(
            { criterion: { skip: 0, take: 100, cookIds: [cookA.user.userId] } },
            cookA.requestingSession,
            cookA.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestOfferId)).toEqual([bookingRequestOfferId]);
    });

    it('treats empty cookIds as no cook filter', async () => {
        // Arrange
        const cook = await setupCook();
        const { bookingRequestOfferId } = await insertOffer(cook.user.userId);

        // Act
        const rows = await adminBookingRequestOfferFindMany(
            { criterion: { skip: 0, take: 100, cookIds: [] } },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(rows.some((row) => row.bookingRequestOfferId === bookingRequestOfferId)).toBe(true);
    });

    it('orders newest first and respects skip and take', async () => {
        // Arrange
        const cook = await setupCook();
        const older = await insertOffer(cook.user.userId, new Date(Date.now() - 120_000));
        await insertOffer(cook.user.userId, new Date(Date.now() - 60_000));

        // Act
        const page = await adminBookingRequestOfferFindMany(
            { criterion: { skip: 1, take: 1, cookIds: [cook.user.userId] } },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert — skip past newest → older row
        expect(page).toHaveLength(1);
        expect(page[0]?.bookingRequestOfferId).toBe(older.bookingRequestOfferId);
    });

    it('returns empty when cookIds match nothing', async () => {
        // Arrange
        const cook = await setupCook();
        await insertOffer(cook.user.userId);

        // Act
        const rows = await adminBookingRequestOfferFindMany(
            { criterion: { skip: 0, take: 100, cookIds: [idCreate()] } },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(rows).toEqual([]);
    });
});
