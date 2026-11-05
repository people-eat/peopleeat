import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestParticipants, bookingRequests } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestCreationMonthStatsFindMany } from './adminBookingRequestCreationMonthStatsFindMany';

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

function yearWindow() {
    const year = 5000 + Math.floor(Math.random() * 4000);
    return {
        year,
        range: {
            startDateTime: new Date(Date.UTC(year, 3, 1)),
            endDateTime: new Date(Date.UTC(year, 8, 30)),
        },
        april: new Date(Date.UTC(year, 3, 15, 12)),
        september: new Date(Date.UTC(year, 8, 15, 12)),
        january: new Date(Date.UTC(year, 0, 15, 12)),
    };
}

async function insertRequest(userId: string, createdAt: Date, participantCount: number) {
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId,
        occasion: 'Birthday',
        dateTime: new Date(createdAt.getTime() + 7 * 86_400_000),
        exactEventAddress: berlin,
        originalMessage: 'Month stats',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        createdAt,
    });
    if (participantCount > 0) {
        await testDb.insert(bookingRequestParticipants).values(
            Array.from({ length: participantCount }, () => ({
                bookingRequestParticipantId: idCreate(),
                bookingRequestId,
                type: 'ADULT' as const,
                name: 'Guest',
                restrictions: [],
            })),
        );
    }
    return bookingRequestId;
}

describe('adminBookingRequestCreationMonthStatsFindMany', () => {
    it('ranks months by request count and sums participants', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Month', lastName: 'Stats' });
        const window = yearWindow();
        await insertRequest(customer.user.userId, window.april, 2);
        await insertRequest(customer.user.userId, window.april, 0);
        await insertRequest(customer.user.userId, window.september, 0);
        await insertRequest(customer.user.userId, window.january, 1);

        // Act
        const stats = await adminBookingRequestCreationMonthStatsFindMany(
            { range: window.range, take: 10 },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(stats).toHaveLength(2);
        expect(stats[0]).toMatchObject({ count: 2, totalParticipants: 2 });
        expect(stats[1]).toMatchObject({ count: 1, totalParticipants: 0 });
        expect(stats[0]!.monthStart.getTime()).toBeLessThan(stats[1]!.monthStart.getTime());
    });

    it('limits the result to take', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Month', lastName: 'Take' });
        const window = yearWindow();
        await insertRequest(customer.user.userId, window.april, 0);
        await insertRequest(customer.user.userId, window.april, 0);
        await insertRequest(customer.user.userId, window.september, 0);

        // Act
        const stats = await adminBookingRequestCreationMonthStatsFindMany(
            { range: window.range, take: 1 },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(stats).toHaveLength(1);
        expect(stats[0]?.count).toBe(2);
    });

    it('returns an empty list when the range has no requests', async () => {
        // Arrange
        const setup = await commandSetup();
        const year = 5000 + Math.floor(Math.random() * 4000);

        // Act
        const stats = await adminBookingRequestCreationMonthStatsFindMany(
            {
                range: {
                    startDateTime: new Date(Date.UTC(year, 1, 1)),
                    endDateTime: new Date(Date.UTC(year, 1, 2)),
                },
                take: 10,
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(stats).toEqual([]);
    });
});
