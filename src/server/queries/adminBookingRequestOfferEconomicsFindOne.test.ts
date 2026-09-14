import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferEconomicsFindOne } from './adminBookingRequestOfferEconomicsFindOne';

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

describe('adminBookingRequestOfferEconomicsFindOne', () => {
    it('returns finite averages including paid revenue after a paid offer insert', async () => {
        // Arrange
        const customer = await commandSetup.withUser();
        const cook = await setupCook();
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: `econ-${idCreate().slice(0, 8)}`,
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId,
            cookId: cook.user.userId,
            userAccepted: true,
            cookAccepted: true,
            menuPriceCents: 40_000,
            travelExpensesCents: 0,
            paymentProviderFeeCents: 0,
            platformFeePercentCook: 10,
            platformFeePercentCustomer: 10,
            platformFeeCentsCook: 4_000,
            platformFeeCentsCustomer: 4_000,
            payoutCentsCook: 36_000,
            totalWithoutDiscountsCentsCustomer: 48_000,
            totalCentsCustomer: 48_000,
            paymentStatus: 'PAYED',
        });

        // Act
        const economics = await adminBookingRequestOfferEconomicsFindOne(customer.requestingSession, customer.serverRuntime);

        // Assert
        expect(Number.isFinite(economics.averageOffersPerRequest)).toBe(true);
        expect(economics.averageOffersPerRequest).toBeGreaterThan(0);
        expect(economics.averageMenuPriceCents).toBeGreaterThan(0);
        expect(economics.averagePaidCustomerTotalCents).toBeGreaterThan(0);
        expect(economics.averagePaidPlatformRevenueCents).toBeGreaterThan(0);
    });
});
