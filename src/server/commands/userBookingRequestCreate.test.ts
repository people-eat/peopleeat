import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { bookingRequestParticipants, bookingRequests, cooks, sessionEvents } from '../db/schema';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { userBookingRequestCreate } from './userBookingRequestCreate';

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

const sampleCreateInput = {
    occasion: 'Birthday',
    dateTime: new Date('2030-06-15T18:00:00.000Z'),
    exactEventAddress: sampleAddress,
    originalMessage: 'Please cook for us.',
    preferences: [],
    participants: [{ type: 'ADULT' as const, name: 'Participant', restrictions: [] }],
    priceClassType: 'MEDIUM' as const,
};

describe('userBookingRequestCreate', () => {
    it('creates a request with participants', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });

        const result = await userBookingRequestCreate(
            userMutationParent(user.userId),
            { input: sampleCreateInput },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, result.referenceId!));
        expect(row?.userId).toBe(user.userId);
        expect(row?.publicationStatus).toBe('PUBLICATION_AUTO_APPROVED');
        expect(row?.priceClassType).toBe('MEDIUM');
        expect(row?.expiresAt).toBeTruthy();
        expect(row?.expiresAt?.toISOString()).toBe('2030-06-15T23:59:59.999Z');

        const participants = await testDb
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, result.referenceId!));
        expect(participants).toHaveLength(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();

        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, requestingSession.sessionId));
        expect(events.some((event) => event.type === 'BOOKING_REQUEST_CREATED')).toBe(true);
    });

    it('rejects when the user is a cook', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        await testDb.insert(cooks).values({ cookId: user.userId });

        await expect(
            userBookingRequestCreate(userMutationParent(user.userId), { input: sampleCreateInput }, requestingSession, serverRuntime),
        ).rejects.toThrow(/userBookingRequestCreate: cooks cannot create booking requests/);
    });
});
