import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequests, cooks } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookBookingRequestDecline } from './cookBookingRequestDecline';

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

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Decline' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

async function insertCustomerBookingRequest() {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: { ...berlin, latitude: 52.53, longitude: 13.41 },
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    return { customer, bookingRequestId };
}

describe('cookBookingRequestDecline', () => {
    it('inserts a bookingRequestCooks row when none exists and publishes', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();

        // Act
        const result = await cookBookingRequestDecline(
            cookMutationParent(user.userId),
            { bookingRequestId, reason: 'Too far this week' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestId });
        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.declinedAt).toBeTruthy();
        expect(details?.declinationReason).toBe('Too far this week');
        expect(details?.menuEvaluationLoading).toBe(false);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('updates an existing bookingRequestCooks row when one already exists', async () => {
        // Arrange — pre-seed the join row (e.g. after an open).
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const openedAt = new Date(Date.now() - 60_000);
        await testDb.insert(bookingRequestCooks).values({
            cookId: user.userId,
            bookingRequestId,
            menuEvaluationLoading: false,
            firstOpenedAt: openedAt,
        });

        // Act
        const result = await cookBookingRequestDecline(
            cookMutationParent(user.userId),
            { bookingRequestId, reason: 'Already booked' },
            requestingSession,
            serverRuntime,
        );

        // Assert — decline stamps reason; firstOpenedAt is preserved.
        expect(result).toEqual({ success: true, referenceId: bookingRequestId });
        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.declinedAt).toBeTruthy();
        expect(details?.declinationReason).toBe('Already booked');
        expect(details?.firstOpenedAt?.getTime()).toBe(openedAt.getTime());
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('trims the reason before persisting', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();

        // Act
        await cookBookingRequestDecline(
            cookMutationParent(user.userId),
            { bookingRequestId, reason: '  Schedule conflict  ' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.declinationReason).toBe('Schedule conflict');
    });

    it('rejects an empty reason without writing or publishing', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();

        // Act + Assert
        await expect(
            cookBookingRequestDecline(
                cookMutationParent(user.userId),
                { bookingRequestId, reason: '   ' },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/reason is required/);

        const [rows, logRows] = await Promise.all([
            testDb
                .select()
                .from(bookingRequestCooks)
                .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId))),
            findLogsForSession(requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/reason is required/);
    });

    it('rejects a missing booking request without writing or publishing', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const missingId = idCreate();

        // Act + Assert
        await expect(
            cookBookingRequestDecline(
                cookMutationParent(user.userId),
                { bookingRequestId: missingId, reason: 'Nope' },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/booking request not found/);

        const [rows, logRows] = await Promise.all([
            testDb
                .select()
                .from(bookingRequestCooks)
                .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, missingId))),
            findLogsForSession(requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows.some((row) => row.level === 'error')).toBe(true);
    });
});
