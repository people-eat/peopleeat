import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestConversionMonthStatsFindMany } from './adminBookingRequestConversionMonthStatsFindMany';

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

describe('adminBookingRequestConversionMonthStatsFindMany', () => {
    it('zero-fills months in the range and reports dual-accept rates', async () => {
        const customer = await commandSetup.withUser();
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Month' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });

        const convertedId = idCreate();
        const openId = idCreate();
        await testDb.insert(bookingRequests).values([
            {
                bookingRequestId: convertedId,
                userId: customer.user.userId,
                occasion: `conv-m-${idCreate().slice(0, 8)}`,
                createdAt: new Date('2033-02-10T12:00:00.000Z'),
                dateTime: new Date('2033-04-01T18:00:00.000Z'),
                exactEventAddress: berlin,
                originalMessage: 'Converted',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
            },
            {
                bookingRequestId: openId,
                userId: customer.user.userId,
                occasion: `conv-m-${idCreate().slice(0, 8)}`,
                createdAt: new Date('2033-02-20T12:00:00.000Z'),
                dateTime: new Date('2033-04-02T18:00:00.000Z'),
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

        const buckets = await adminBookingRequestConversionMonthStatsFindMany(
            {
                range: {
                    startDateTime: new Date('2033-01-01T00:00:00.000Z'),
                    endDateTime: new Date('2033-03-31T23:59:59.999Z'),
                },
                dateBasis: 'createdAt',
            },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(buckets).toHaveLength(3);
        expect(buckets[0]?.requestCount).toBe(0);
        expect(buckets[0]?.rate).toBe(0);
        expect(buckets[1]?.requestCount).toBeGreaterThanOrEqual(2);
        expect(buckets[1]?.convertedCount).toBeGreaterThanOrEqual(1);
        expect(buckets[1]?.rate).toBe((buckets[1]?.convertedCount ?? 0) / (buckets[1]?.requestCount ?? 1));
        expect(buckets[2]?.requestCount).toBe(0);
    });

    it('buckets by event dateTime when dateBasis is dateTime', async () => {
        const customer = await commandSetup.withUser();
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'EventMonth' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });

        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: `conv-mdt-${idCreate().slice(0, 8)}`,
            createdAt: new Date('2034-01-15T12:00:00.000Z'),
            dateTime: new Date('2034-05-10T18:00:00.000Z'),
            exactEventAddress: berlin,
            originalMessage: 'Event month',
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

        const byCreated = await adminBookingRequestConversionMonthStatsFindMany(
            {
                range: {
                    startDateTime: new Date('2034-01-01T00:00:00.000Z'),
                    endDateTime: new Date('2034-05-31T23:59:59.999Z'),
                },
                dateBasis: 'createdAt',
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const byEvent = await adminBookingRequestConversionMonthStatsFindMany(
            {
                range: {
                    startDateTime: new Date('2034-01-01T00:00:00.000Z'),
                    endDateTime: new Date('2034-05-31T23:59:59.999Z'),
                },
                dateBasis: 'dateTime',
            },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(byCreated).toHaveLength(5);
        expect(byEvent).toHaveLength(5);
        expect(byCreated[0]?.convertedCount).toBeGreaterThanOrEqual(1);
        expect(byCreated[4]?.convertedCount).toBe(0);
        expect(byEvent[0]?.convertedCount).toBe(0);
        expect(byEvent[4]?.convertedCount).toBeGreaterThanOrEqual(1);
    });
});
