import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestParticipants, bookingRequests, sessionEvents } from '../db/schema';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { userBookingRequestOpenToOtherCooks } from './userBookingRequestOpenToOtherCooks';

const sampleAddress = {
    displayText: 'Musterstraße 1, 80331 München',
    latitude: 48.137,
    longitude: 11.575,
    addressLine1: 'Musterstraße 1',
    addressLine2: '',
    city: 'München',
    postCode: '80331',
    state: 'BY',
    country: 'DE',
};

async function insertExclusiveRequest(userId: string, participantCount: number) {
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId,
        occasion: 'Dinner',
        dateTime: new Date('2030-06-15T18:00:00.000Z'),
        exactEventAddress: sampleAddress,
        originalMessage: 'Please cook',
        publicationStatus: 'PUBLICATION_DIRECT_TO_COOK',
        requestedCookId: null,
        preferences: [],
    });
    await testDb.insert(bookingRequestParticipants).values(
        Array.from({ length: participantCount }, (_, index) => ({
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT' as const,
            name: `Guest ${index + 1}`,
            restrictions: [],
        })),
    );
    return bookingRequestId;
}

describe('userBookingRequestOpenToOtherCooks', () => {
    it('is idempotent when the request is already open', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: user.userId,
            occasion: 'Dinner',
            dateTime: new Date('2030-06-15T18:00:00.000Z'),
            exactEventAddress: sampleAddress,
            originalMessage: 'Please cook',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        const result = await userBookingRequestOpenToOtherCooks(
            userMutationParent(user.userId),
            { bookingRequestId },
            requestingSession,
            serverRuntime,
        );
        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.publicationStatus).toBe('PUBLICATION_AUTO_APPROVED');
    });

    it('opens an exclusive request under 12 to auto-approved', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const bookingRequestId = await insertExclusiveRequest(user.userId, 4);

        const result = await userBookingRequestOpenToOtherCooks(
            userMutationParent(user.userId),
            { bookingRequestId },
            requestingSession,
            serverRuntime,
        );
        expect(result.success).toBe(true);

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.publicationStatus).toBe('PUBLICATION_AUTO_APPROVED');

        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, requestingSession.sessionId));
        expect(events.some((event) => event.type === 'BOOKING_REQUEST_OPENED_TO_OTHER_COOKS')).toBe(true);
    });

    it('opens a 12-plus exclusive request to admin review', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const bookingRequestId = await insertExclusiveRequest(user.userId, 12);

        await userBookingRequestOpenToOtherCooks(userMutationParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.publicationStatus).toBe('PUBLICATION_BLOCKED_BY_ADMIN_REVIEW');
    });
});
