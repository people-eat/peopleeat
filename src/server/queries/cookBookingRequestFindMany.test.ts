import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequests, cooks } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookBookingRequestFindMany } from './cookBookingRequestFindMany';
import { cookBookingRequestFindOne } from './cookBookingRequestFindOne';

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

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

/** A cook visible to the open pool: approved, visible, with a travel origin and no distance cap. */
async function setupPoolCook() {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Pool' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
    });
    return setup;
}

async function insertCustomerBookingRequest() {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Anniversary',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: { ...berlin, latitude: 52.53, longitude: 13.41 },
        priceClassType: 'HIGH',
        originalMessage: 'Special dinner',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    return { bookingRequestId };
}

describe('cookBookingRequestFindMany', () => {
    it('returns open-pool booking requests visible to the cook', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();

        // Act
        const rows = await cookBookingRequestFindMany(
            cookParent(user.userId),
            { criterion: { onlyDeclined: false } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestId)).toContain(bookingRequestId);
    });

    it('filters by onlyDeclined: excludes declined requests by default, includes them when onlyDeclined is true', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId: openId } = await insertCustomerBookingRequest();
        const { bookingRequestId: declinedId } = await insertCustomerBookingRequest();
        await testDb.insert(bookingRequestCooks).values({
            cookId: user.userId,
            bookingRequestId: declinedId,
            declinedAt: new Date(),
            declinationReason: 'Not available',
        });

        // Act
        const notDeclined = await cookBookingRequestFindMany(
            cookParent(user.userId),
            { criterion: { onlyDeclined: false } },
            requestingSession,
            serverRuntime,
        );
        const declinedOnly = await cookBookingRequestFindMany(
            cookParent(user.userId),
            { criterion: { onlyDeclined: true } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        const notDeclinedIds = notDeclined.map((row) => row.bookingRequestId);
        expect(notDeclinedIds).toContain(openId);
        expect(notDeclinedIds).not.toContain(declinedId);

        const declinedOnlyIds = declinedOnly.map((row) => row.bookingRequestId);
        expect(declinedOnlyIds).toContain(declinedId);
        expect(declinedOnlyIds).not.toContain(openId);
    });
});

describe('cookBookingRequestFindOne', () => {
    it('returns the matching booking request from either the open or declined pool', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId: openId } = await insertCustomerBookingRequest();
        const { bookingRequestId: declinedId } = await insertCustomerBookingRequest();
        await testDb.insert(bookingRequestCooks).values({
            cookId: user.userId,
            bookingRequestId: declinedId,
            declinedAt: new Date(),
            declinationReason: 'Not available',
        });

        // Act
        const openResult = await cookBookingRequestFindOne(
            cookParent(user.userId),
            { bookingRequestId: openId },
            requestingSession,
            serverRuntime,
        );
        const declinedResult = await cookBookingRequestFindOne(
            cookParent(user.userId),
            { bookingRequestId: declinedId },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(openResult?.bookingRequestId).toBe(openId);
        expect(declinedResult?.bookingRequestId).toBe(declinedId);
    });

    it('returns null when the booking request id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupPoolCook();

        // Act
        const result = await cookBookingRequestFindOne(
            cookParent(user.userId),
            { bookingRequestId: idCreate() },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toBeNull();
    });
});
