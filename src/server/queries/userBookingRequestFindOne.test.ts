import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequests } from '../db/schema';
import type { GqlSUser } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userBookingRequestFindOne } from './userBookingRequestFindOne';

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

function userParent(userId: string): GqlSUser {
    return { userId } as unknown as GqlSUser;
}

async function insertBookingRequest(userId: string) {
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: sampleAddress,
        priceClassType: 'MEDIUM',
        originalMessage: 'Please cook for us.',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    return { bookingRequestId };
}

describe('userBookingRequestFindOne', () => {
    it('returns the mapped booking request for the owner on a hit', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const { bookingRequestId } = await insertBookingRequest(user.userId);

        // Act
        const row = await userBookingRequestFindOne(userParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({ bookingRequestId, userId: user.userId, occasion: 'Birthday' });
    });

    it('returns null when the booking request id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();

        // Act
        const row = await userBookingRequestFindOne(
            userParent(user.userId),
            { bookingRequestId: idCreate() },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(row).toBeNull();
    });

    it('returns null when the requesting session belongs to a different user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const { bookingRequestId } = await insertBookingRequest(owner.user.userId);

        // Act
        const row = await userBookingRequestFindOne(
            userParent(owner.user.userId),
            { bookingRequestId },
            other.requestingSession,
            other.serverRuntime,
        );

        // Assert
        expect(row).toBeNull();
    });
});
