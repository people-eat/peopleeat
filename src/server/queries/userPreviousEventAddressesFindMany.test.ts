import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequests } from '../db/schema';
import type { BookingRequestExactEventAddress } from '../domain/bookingRequest';
import type { GqlSUser } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userPreviousEventAddressesFindMany } from './userPreviousEventAddressesFindMany';

const munich: BookingRequestExactEventAddress = {
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

const berlin: BookingRequestExactEventAddress = {
    displayText: 'Unter den Linden 1, 10117 Berlin',
    latitude: 52.517,
    longitude: 13.389,
    addressLine1: 'Unter den Linden 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10117',
    state: 'BE',
    country: 'DE',
};

function userParent(userId: string): GqlSUser {
    return { userId } as unknown as GqlSUser;
}

async function insertBookingRequest(userId: string, address: BookingRequestExactEventAddress, createdAt: Date) {
    await testDb.insert(bookingRequests).values({
        bookingRequestId: idCreate(),
        userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: address,
        priceClassType: 'MEDIUM',
        originalMessage: 'Please cook for us.',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        createdAt,
    });
}

describe('userPreviousEventAddressesFindMany', () => {
    it('returns distinct previous addresses newest first, keeps newest duplicate, and caps at five', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        await insertBookingRequest(user.userId, munich, new Date('2024-01-01T00:00:00.000Z'));
        await insertBookingRequest(user.userId, berlin, new Date('2024-02-01T00:00:00.000Z'));
        await insertBookingRequest(
            user.userId,
            { ...munich, displayText: 'Musterstraße 1, 80331 München, Deutschland' },
            new Date('2024-03-01T00:00:00.000Z'),
        );
        for (let index = 0; index < 3; index++) {
            await insertBookingRequest(
                user.userId,
                {
                    ...berlin,
                    addressLine1: `Extra Street ${index}`,
                    displayText: `Extra Street ${index}, 10117 Berlin`,
                },
                new Date(`2024-04-0${index + 1}T00:00:00.000Z`),
            );
        }

        // Act
        const rows = await userPreviousEventAddressesFindMany(userParent(user.userId), requestingSession, serverRuntime);

        // Assert — 3 extras + munich (deduped) + berlin = 5
        expect(rows?.map((row) => row.addressLine1)).toEqual([
            'Extra Street 2',
            'Extra Street 1',
            'Extra Street 0',
            'Musterstraße 1',
            'Unter den Linden 1',
        ]);
        expect(rows?.[3]?.displayText).toBe('Musterstraße 1, 80331 München, Deutschland');
    });

    it('returns null when the requesting session belongs to a different user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        await insertBookingRequest(owner.user.userId, munich, new Date('2024-01-01T00:00:00.000Z'));

        // Act
        const result = await userPreviousEventAddressesFindMany(
            userParent(owner.user.userId),
            other.requestingSession,
            other.serverRuntime,
        );

        // Assert
        expect(result).toBeNull();
    });

    it('returns an empty list when the owner has no booking requests', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();

        // Act
        const rows = await userPreviousEventAddressesFindMany(userParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});
