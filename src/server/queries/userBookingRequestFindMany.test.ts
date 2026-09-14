import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequests } from '../db/schema';
import type { GqlSUser } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userBookingRequestFindMany } from './userBookingRequestFindMany';

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

async function insertBookingRequest(userId: string, createdAt?: Date) {
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
        ...(createdAt ? { createdAt } : {}),
    });
    return { bookingRequestId };
}

describe('userBookingRequestFindMany', () => {
    it("returns the owner's booking requests ordered by createdAt descending", async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const { bookingRequestId: older } = await insertBookingRequest(user.userId, new Date('2024-01-01T00:00:00.000Z'));
        const { bookingRequestId: newer } = await insertBookingRequest(user.userId, new Date('2024-02-01T00:00:00.000Z'));

        // Act
        const rows = await userBookingRequestFindMany(userParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(rows?.map((row) => row.bookingRequestId)).toEqual([newer, older]);
    });

    it('returns null when the requesting session belongs to a different user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        await insertBookingRequest(owner.user.userId);

        // Act
        const result = await userBookingRequestFindMany(userParent(owner.user.userId), other.requestingSession, other.serverRuntime);

        // Assert
        expect(result).toBeNull();
    });
});
