import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCallSlotCreationsFindMany } from './adminCallSlotCreationsFindMany';

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

function isolatedDays() {
    const year = 5000 + Math.floor(Math.random() * 4000);
    const day = 5 + Math.floor(Math.random() * 15);
    return {
        startDateTime: new Date(Date.UTC(year, 6, day)),
        endDateTime: new Date(Date.UTC(year, 6, day + 2)),
        createdAt: new Date(Date.UTC(year, 6, day + 1, 12)),
    };
}

describe('adminCallSlotCreationsFindMany', () => {
    it('returns an ascending zero-filled day series with the seeded slot counted', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Slot', lastName: 'Customer' });
        const cook = await commandSetup.withUser({ firstName: 'Slot', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const bookingRequestId = idCreate();
        const bookingRequestOfferId = idCreate();
        const window = isolatedDays();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Birthday',
            dateTime: new Date(Date.now() + 7 * 86_400_000),
            exactEventAddress: berlin,
            originalMessage: 'Call slot',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId,
            bookingRequestId,
            cookId: cook.user.userId,
            menuPriceCents: 5000,
            travelExpensesCents: 0,
            paymentProviderFeeCents: 0,
            platformFeePercentCook: 10,
            platformFeePercentCustomer: 10,
            platformFeeCentsCook: 500,
            platformFeeCentsCustomer: 500,
            payoutCentsCook: 4500,
            totalWithoutDiscountsCentsCustomer: 5500,
        });
        await testDb.insert(cookCallSlotBookings).values({
            cookCallSlotBookingId: idCreate(),
            cookId: cook.user.userId,
            userId: customer.user.userId,
            bookingRequestOfferId,
            startAt: new Date(window.createdAt.getTime() + 86_400_000),
            endAt: new Date(window.createdAt.getTime() + 86_400_000 + 30 * 60_000),
            initiator: 'CUSTOMER',
            createdAt: window.createdAt,
        });

        // Act
        const series = await adminCallSlotCreationsFindMany(
            { range: { startDateTime: window.startDateTime, endDateTime: window.endDateTime }, granularity: 'day' },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(series).toHaveLength(3);
        for (let index = 1; index < series.length; index += 1) {
            expect(series[index]!.bucketStart.getTime()).toBeGreaterThan(series[index - 1]!.bucketStart.getTime());
        }
        const hits = series.filter((bucket) => {
            const start = bucket.bucketStart.getTime();
            return window.createdAt.getTime() >= start && window.createdAt.getTime() < start + 86_400_000;
        });
        expect(hits).toHaveLength(1);
        expect(hits[0]!.count).toBe(1);
        expect(series.filter((bucket) => bucket !== hits[0]).every((bucket) => bucket.count === 0)).toBe(true);
    });
});
