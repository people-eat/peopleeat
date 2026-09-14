import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestCookOfferStatsFindMany } from './adminBookingRequestCookOfferStatsFindMany';

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

async function setupCook(firstName: string) {
    const setup = await commandSetup.withUser({ firstName, lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('adminBookingRequestCookOfferStatsFindMany', () => {
    it('ranks cooks by offer count and dual-accept conversions', async () => {
        // Arrange
        const customer = await commandSetup.withUser();
        const cookMany = await setupCook(`Many-${idCreate().slice(0, 6)}`);
        const cookConverted = await setupCook(`Won-${idCreate().slice(0, 6)}`);

        async function insertOffer(cookId: string, dualAccepted: boolean): Promise<void> {
            const bookingRequestId = idCreate();
            await testDb.insert(bookingRequests).values({
                bookingRequestId,
                userId: customer.user.userId,
                occasion: `cook-stat-${idCreate().slice(0, 8)}`,
                dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                exactEventAddress: berlin,
                originalMessage: 'Looking for a chef',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
            });
            await testDb.insert(bookingRequestOffers).values({
                bookingRequestOfferId: idCreate(),
                bookingRequestId,
                cookId,
                userAccepted: dualAccepted ? true : null,
                cookAccepted: true,
                menuPriceCents: 20_000,
                travelExpensesCents: 0,
                paymentProviderFeeCents: 0,
                platformFeePercentCook: 10,
                platformFeePercentCustomer: 10,
                platformFeeCentsCook: 2_000,
                platformFeeCentsCustomer: 2_000,
                payoutCentsCook: 18_000,
                totalWithoutDiscountsCentsCustomer: 24_000,
                totalCentsCustomer: 24_000,
                paymentStatus: dualAccepted ? 'PAYED' : 'EMPTY',
            });
        }

        const [topByOffers] = await adminBookingRequestCookOfferStatsFindMany(
            { take: 1, sortBy: 'offerCount' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const [topByConversions] = await adminBookingRequestCookOfferStatsFindMany(
            { take: 1, sortBy: 'conversionCount' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const offersNeeded = (topByOffers?.offerCount ?? 0) + 2;
        const conversionsNeeded = (topByConversions?.conversionCount ?? 0) + 1;

        for (let index = 0; index < offersNeeded; index += 1) {
            await insertOffer(cookMany.user.userId, false);
        }
        for (let index = 0; index < conversionsNeeded; index += 1) {
            await insertOffer(cookConverted.user.userId, true);
        }

        // Act
        const byOffers = await adminBookingRequestCookOfferStatsFindMany(
            { take: 3, sortBy: 'offerCount' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const byConversions = await adminBookingRequestCookOfferStatsFindMany(
            { take: 3, sortBy: 'conversionCount' },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(byOffers[0]?.cookId).toBe(cookMany.user.userId);
        expect(byOffers[0]?.offerCount).toBeGreaterThanOrEqual(offersNeeded);
        expect(byConversions[0]?.cookId).toBe(cookConverted.user.userId);
        expect(byConversions[0]?.conversionCount).toBeGreaterThanOrEqual(conversionsNeeded);
        expect(byConversions.every((row) => row.conversionCount > 0)).toBe(true);
    });
});
