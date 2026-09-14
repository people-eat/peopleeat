import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestParticipants, bookingRequests } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestAverageParticipantsFindOne } from './adminBookingRequestAverageParticipantsFindOne';

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

async function insertRequestWithParticipants(userId: string, participantCount: number): Promise<void> {
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId,
        occasion: `avg-${idCreate().slice(0, 8)}`,
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    for (let index = 0; index < participantCount; index += 1) {
        await testDb.insert(bookingRequestParticipants).values({
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT',
            name: `Guest ${index + 1}`,
            restrictions: [],
        });
    }
}

async function requestParticipantTotals(): Promise<{ requestCount: number; totalParticipants: number }> {
    const result = await testDb.execute<{ request_count: string | number; total_participants: string | number }>(sql`
        SELECT
            COUNT(DISTINCT br."bookingRequestId")::int AS request_count,
            COUNT(p."bookingRequestParticipantId")::int AS total_participants
        FROM "BookingRequests" br
        LEFT JOIN "BookingRequestParticipants" p
          ON p."bookingRequestId" = br."bookingRequestId"
    `);
    const rows = Array.isArray(result) ? result : result.rows;
    const row = rows[0];
    return {
        requestCount: typeof row?.request_count === 'number' ? row.request_count : Number(row?.request_count ?? 0),
        totalParticipants: typeof row?.total_participants === 'number' ? row.total_participants : Number(row?.total_participants ?? 0),
    };
}

describe('adminBookingRequestAverageParticipantsFindOne', () => {
    it('averages participant counts across all booking requests', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const before = await requestParticipantTotals();

        await insertRequestWithParticipants(user.userId, 2);
        await insertRequestWithParticipants(user.userId, 6);

        // Act
        const average = await adminBookingRequestAverageParticipantsFindOne(requestingSession, serverRuntime);

        // Assert
        const expected = Math.round((before.totalParticipants + 8) / (before.requestCount + 2));
        expect(average).toBe(expected);
    });
});
