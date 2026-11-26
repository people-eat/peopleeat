import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestConversionRateFindOne } from './adminBookingRequestConversionRateFindOne';

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

describe('adminBookingRequestConversionRateFindOne', () => {
    it('returns null rate when no requests fall in the range', async () => {
        const setup = await commandSetup.withUser();
        const startDateTime = new Date('2090-01-01T00:00:00.000Z');
        const endDateTime = new Date('2090-01-31T23:59:59.999Z');

        const result = await adminBookingRequestConversionRateFindOne(
            { range: { startDateTime, endDateTime }, dateBasis: 'createdAt' },
            setup.requestingSession,
            setup.serverRuntime,
        );

        expect(result).toEqual({ requestCount: 0, convertedCount: 0, rate: null });
    });

    it('counts dual-accepted requests against all requests by createdAt', async () => {
        const customer = await commandSetup.withUser();
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Convert' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });

        const createdAt = new Date('2031-06-15T12:00:00.000Z');
        const convertedId = idCreate();
        const openId = idCreate();

        await testDb.insert(bookingRequests).values([
            {
                bookingRequestId: convertedId,
                userId: customer.user.userId,
                occasion: `conv-rate-${idCreate().slice(0, 8)}`,
                dateTime: new Date('2031-08-01T18:00:00.000Z'),
                createdAt,
                exactEventAddress: berlin,
                originalMessage: 'Converted',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
            },
            {
                bookingRequestId: openId,
                userId: customer.user.userId,
                occasion: `conv-rate-${idCreate().slice(0, 8)}`,
                dateTime: new Date('2031-08-02T18:00:00.000Z'),
                createdAt,
                exactEventAddress: berlin,
                originalMessage: 'Open',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
            },
        ]);

        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId: convertedId,
            cookId: cook.user.userId,
            userAccepted: true,
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
            paymentStatus: 'PAYED',
        });

        const result = await adminBookingRequestConversionRateFindOne(
            {
                range: {
                    startDateTime: new Date('2031-06-01T00:00:00.000Z'),
                    endDateTime: new Date('2031-06-30T23:59:59.999Z'),
                },
                dateBasis: 'createdAt',
            },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(result.requestCount).toBeGreaterThanOrEqual(2);
        expect(result.convertedCount).toBeGreaterThanOrEqual(1);
        expect(result.rate).toBe(result.convertedCount / result.requestCount);
    });

    it('places the same request by event dateTime when dateBasis is dateTime', async () => {
        const customer = await commandSetup.withUser();
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Event' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });

        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: `conv-dt-${idCreate().slice(0, 8)}`,
            createdAt: new Date('2032-01-10T12:00:00.000Z'),
            dateTime: new Date('2032-03-20T18:00:00.000Z'),
            exactEventAddress: berlin,
            originalMessage: 'Event basis',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId,
            cookId: cook.user.userId,
            userAccepted: true,
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
            paymentStatus: 'PAYED',
        });

        const byCreated = await adminBookingRequestConversionRateFindOne(
            {
                range: {
                    startDateTime: new Date('2032-01-01T00:00:00.000Z'),
                    endDateTime: new Date('2032-01-31T23:59:59.999Z'),
                },
                dateBasis: 'createdAt',
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const byEventInCreatedMonth = await adminBookingRequestConversionRateFindOne(
            {
                range: {
                    startDateTime: new Date('2032-01-01T00:00:00.000Z'),
                    endDateTime: new Date('2032-01-31T23:59:59.999Z'),
                },
                dateBasis: 'dateTime',
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const byEventInEventMonth = await adminBookingRequestConversionRateFindOne(
            {
                range: {
                    startDateTime: new Date('2032-03-01T00:00:00.000Z'),
                    endDateTime: new Date('2032-03-31T23:59:59.999Z'),
                },
                dateBasis: 'dateTime',
            },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(byCreated.convertedCount).toBeGreaterThanOrEqual(1);
        expect(byEventInCreatedMonth.convertedCount).toBe(0);
        expect(byEventInEventMonth.convertedCount).toBeGreaterThanOrEqual(1);
    });
});
