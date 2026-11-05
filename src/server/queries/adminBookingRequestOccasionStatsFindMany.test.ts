import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestParticipants, bookingRequests } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOccasionStatsFindMany } from './adminBookingRequestOccasionStatsFindMany';

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

function isolatedRange() {
    const year = 5000 + Math.floor(Math.random() * 4000);
    return {
        range: {
            startDateTime: new Date(Date.UTC(year, 3, 1)),
            endDateTime: new Date(Date.UTC(year, 3, 20)),
        },
        inside: new Date(Date.UTC(year, 3, 10, 12)),
        outside: new Date(Date.UTC(year, 5, 10, 12)),
    };
}

async function insertRequest(userId: string, occasion: string, createdAt: Date, participantCount: number) {
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId,
        occasion,
        dateTime: new Date(createdAt.getTime() + 7 * 86_400_000),
        exactEventAddress: berlin,
        originalMessage: 'Occasion stats',
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
}

describe('adminBookingRequestOccasionStatsFindMany', () => {
    it('ranks occasions by request count and sums participants inside the range', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Occasion', lastName: 'Stats' });
        const window = isolatedRange();
        const token = idCreate();
        const popular = `popular-${token}`;
        const rare = `rare-${token}`;
        await insertRequest(customer.user.userId, popular, window.inside, 2);
        await insertRequest(customer.user.userId, popular, window.inside, 1);
        await insertRequest(customer.user.userId, rare, window.inside, 0);
        await insertRequest(customer.user.userId, popular, window.outside, 4);

        // Act
        const stats = await adminBookingRequestOccasionStatsFindMany(
            { range: window.range, take: 10 },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(stats).toEqual([
            { occasion: popular, count: 2, totalParticipants: 3 },
            { occasion: rare, count: 1, totalParticipants: 0 },
        ]);
    });

    it('breaks count ties by occasion ascending', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Occasion', lastName: 'Tie' });
        const window = isolatedRange();
        const token = idCreate();
        const first = `a-${token}`;
        const second = `z-${token}`;
        await insertRequest(customer.user.userId, second, window.inside, 0);
        await insertRequest(customer.user.userId, first, window.inside, 0);

        // Act
        const stats = await adminBookingRequestOccasionStatsFindMany(
            { range: window.range, take: 10 },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(stats.map((stat) => stat.occasion)).toEqual([first, second]);
    });

    it('limits the result to take', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Occasion', lastName: 'Take' });
        const window = isolatedRange();
        const token = idCreate();
        await insertRequest(customer.user.userId, `popular-${token}`, window.inside, 0);
        await insertRequest(customer.user.userId, `popular-${token}`, window.inside, 0);
        await insertRequest(customer.user.userId, `rare-${token}`, window.inside, 0);

        // Act
        const stats = await adminBookingRequestOccasionStatsFindMany(
            { range: window.range, take: 1 },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(stats).toEqual([{ occasion: `popular-${token}`, count: 2, totalParticipants: 0 }]);
    });

    it('returns an empty list when the range has no requests', async () => {
        // Arrange
        const setup = await commandSetup();
        const year = 5000 + Math.floor(Math.random() * 4000);

        // Act
        const stats = await adminBookingRequestOccasionStatsFindMany(
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
