import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequests } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestCreationsFindMany } from './adminBookingRequestCreationsFindMany';

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

describe('adminBookingRequestCreationsFindMany', () => {
    it('returns an ascending zero-filled day series with the seeded day counted', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Creation', lastName: 'Request' });
        const window = isolatedDays();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: idCreate(),
            userId: customer.user.userId,
            occasion: 'Birthday',
            dateTime: new Date(window.createdAt.getTime() + 7 * 86_400_000),
            exactEventAddress: berlin,
            originalMessage: 'Creation series',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
            createdAt: window.createdAt,
        });

        // Act
        const series = await adminBookingRequestCreationsFindMany(
            { range: { startDateTime: window.startDateTime, endDateTime: window.endDateTime } },
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
