import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminAnalyticsBookingRequestMarketplaceStatsFindOne } from './adminAnalyticsBookingRequestMarketplaceStatsFindOne';

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

function offerValues(bookingRequestId: string, cookId: string) {
    return {
        bookingRequestOfferId: idCreate(),
        bookingRequestId,
        cookId,
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
    };
}

describe('adminAnalyticsBookingRequestMarketplaceStatsFindOne', () => {
    it('returns zeros when no requests fall in the range', async () => {
        const setup = await commandSetup.withUser();
        const result = await adminAnalyticsBookingRequestMarketplaceStatsFindOne(
            { startDateTime: new Date('2091-01-01T00:00:00.000Z'), endDateTime: new Date('2091-01-31T23:59:59.999Z') },
            setup.requestingSession,
            setup.serverRuntime,
        );

        expect(result).toEqual({
            requestCount: 0,
            withOfferCount: 0,
            dualAcceptedCount: 0,
            paidCount: 0,
            paymentFailedCount: 0,
            chefDirectCount: 0,
            radiusCount: 0,
        });
    });

    it('splits chef-direct vs radius and counts offer, dual-accept, paid, and failed rows', async () => {
        const customer = await commandSetup.withUser();
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Market' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const createdAt = new Date('2033-04-12T12:00:00.000Z');
        const radiusPaidId = idCreate();
        const directFailedId = idCreate();
        const openId = idCreate();

        await testDb.insert(bookingRequests).values([
            {
                bookingRequestId: radiusPaidId,
                userId: customer.user.userId,
                occasion: `mkt-${idCreate().slice(0, 8)}`,
                dateTime: new Date('2033-06-01T18:00:00.000Z'),
                createdAt,
                exactEventAddress: berlin,
                originalMessage: 'Radius paid',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
            },
            {
                bookingRequestId: directFailedId,
                userId: customer.user.userId,
                occasion: `mkt-${idCreate().slice(0, 8)}`,
                dateTime: new Date('2033-06-02T18:00:00.000Z'),
                createdAt,
                exactEventAddress: berlin,
                originalMessage: 'Direct failed',
                publicationStatus: 'PUBLICATION_DIRECT_TO_COOK',
                preferences: [],
            },
            {
                bookingRequestId: openId,
                userId: customer.user.userId,
                occasion: `mkt-${idCreate().slice(0, 8)}`,
                dateTime: new Date('2033-06-03T18:00:00.000Z'),
                createdAt,
                exactEventAddress: berlin,
                originalMessage: 'Open',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
            },
        ]);

        await testDb.insert(bookingRequestOffers).values([
            {
                ...offerValues(radiusPaidId, cook.user.userId),
                userAccepted: true,
                cookAccepted: true,
                paymentStatus: 'PAYED',
            },
            {
                ...offerValues(directFailedId, cook.user.userId),
                userAccepted: true,
                cookAccepted: false,
                paymentStatus: 'FAILED',
            },
        ]);

        const result = await adminAnalyticsBookingRequestMarketplaceStatsFindOne(
            {
                startDateTime: new Date('2033-04-01T00:00:00.000Z'),
                endDateTime: new Date('2033-04-30T23:59:59.999Z'),
            },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(result.requestCount).toBeGreaterThanOrEqual(3);
        expect(result.withOfferCount).toBeGreaterThanOrEqual(2);
        expect(result.dualAcceptedCount).toBeGreaterThanOrEqual(1);
        expect(result.paidCount).toBeGreaterThanOrEqual(1);
        expect(result.paymentFailedCount).toBeGreaterThanOrEqual(1);
        expect(result.chefDirectCount).toBeGreaterThanOrEqual(1);
        expect(result.radiusCount).toBeGreaterThanOrEqual(2);
        expect(result.chefDirectCount + result.radiusCount).toBe(result.requestCount);
    });
});
