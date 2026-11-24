import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { SessionEventCreate } from '../db/schema';
import { bookingRequests, sessionEvents, sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { adminBookingRequestCreatingSessionFindOne } from './adminBookingRequestCreatingSessionFindOne';

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

async function insertBookingRequest(userId: string): Promise<string> {
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 86_400_000),
        exactEventAddress: berlin,
        originalMessage: 'Origin test',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    return bookingRequestId;
}

describe('adminBookingRequestCreatingSessionFindOne', () => {
    it('returns the creating session first-touch fields', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Origin', lastName: 'Hit' });
        await testDb
            .update(sessions)
            .set({ landingPath: '/venues/lake-house', referrer: 'https://partner.example/offer' })
            .where(eq(sessions.sessionId, setup.requestingSession.sessionId));
        const bookingRequestId = await insertBookingRequest(setup.user.userId);
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            type: 'BOOKING_REQUEST_CREATED',
            payload: { bookingRequestId },
        });

        const result = await adminBookingRequestCreatingSessionFindOne(bookingRequestId, setup.serverRuntime);

        expect(result).toMatchObject({
            sessionId: setup.requestingSession.sessionId,
            landingPath: '/venues/lake-house',
            referrer: 'https://partner.example/offer',
            isImpersonation: false,
        });
    });

    it('returns null when no create event exists', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Origin', lastName: 'Miss' });
        const bookingRequestId = await insertBookingRequest(setup.user.userId);

        await expect(adminBookingRequestCreatingSessionFindOne(bookingRequestId, setup.serverRuntime)).resolves.toBeNull();
    });

    it('returns null for admin-created requests without a create event', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Create' });
        const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Create' });
        const bookingRequestId = await insertBookingRequest(customer.user.userId);

        await expect(adminBookingRequestCreatingSessionFindOne(bookingRequestId, admin.serverRuntime)).resolves.toBeNull();
    });

    it('picks the earliest create event when duplicates exist', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Origin', lastName: 'Dup' });
        const laterSessionId = idCreate();
        await testDb.insert(sessions).values({
            sessionId: laterSessionId,
            userId: setup.user.userId,
            landingPath: '/later',
        });
        await testDb.update(sessions).set({ landingPath: '/first' }).where(eq(sessions.sessionId, setup.requestingSession.sessionId));
        const bookingRequestId = await insertBookingRequest(setup.user.userId);
        const earlier = new Date('2024-01-01T00:00:00.000Z');
        const later = new Date('2024-06-01T00:00:00.000Z');
        await testDb.insert(sessionEvents).values([
            {
                sessionEventId: idCreate(),
                sessionId: laterSessionId,
                type: 'BOOKING_REQUEST_CREATED',
                payload: { bookingRequestId },
                createdAt: later,
            },
            {
                sessionEventId: idCreate(),
                sessionId: setup.requestingSession.sessionId,
                type: 'BOOKING_REQUEST_CREATED',
                payload: { bookingRequestId },
                createdAt: earlier,
            },
        ]);

        const result = await adminBookingRequestCreatingSessionFindOne(bookingRequestId, setup.serverRuntime);

        expect(result).toMatchObject({
            sessionId: setup.requestingSession.sessionId,
            landingPath: '/first',
        });
    });

    it('ignores predecessor empty-payload create events', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Origin', lastName: 'Legacy' });
        await testDb.update(sessions).set({ landingPath: '/amex' }).where(eq(sessions.sessionId, setup.requestingSession.sessionId));
        const bookingRequestId = await insertBookingRequest(setup.user.userId);
        await testDb.insert(sessionEvents).values({
            sessionEventId: idCreate(),
            sessionId: setup.requestingSession.sessionId,
            type: 'BOOKING_REQUEST_CREATED',
            payload: {} as SessionEventCreate['payload'],
        });

        await expect(adminBookingRequestCreatingSessionFindOne(bookingRequestId, setup.serverRuntime)).resolves.toBeNull();
    });

    it('marks impersonation on the creating session', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Origin', lastName: 'Impersonate' });
        const returnSessionId = idCreate();
        await testDb.insert(sessions).values({ sessionId: returnSessionId, userId: setup.user.userId });
        await testDb
            .update(sessions)
            .set({ impersonationReturnSessionId: returnSessionId, landingPath: '/admin' })
            .where(eq(sessions.sessionId, setup.requestingSession.sessionId));
        const bookingRequestId = await insertBookingRequest(setup.user.userId);
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            type: 'BOOKING_REQUEST_CREATED',
            payload: { bookingRequestId },
        });

        const result = await adminBookingRequestCreatingSessionFindOne(bookingRequestId, setup.serverRuntime);

        expect(result).toMatchObject({
            sessionId: setup.requestingSession.sessionId,
            isImpersonation: true,
            landingPath: '/admin',
        });
    });
});
