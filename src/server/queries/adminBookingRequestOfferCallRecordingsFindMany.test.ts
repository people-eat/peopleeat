import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferCallRecordings,
    bookingRequestOfferCallRooms,
    bookingRequestOffers,
    bookingRequests,
    cooks,
} from '../db/schema';
import type { GqlSAdminBookingRequestOffer } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferCallRecordingsFindMany } from './adminBookingRequestOfferCallRecordingsFindMany';

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

async function seedOffer() {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Recording' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });
    const customerSetup = await commandSetup.withUser({ firstName: 'Guest', lastName: 'Recording' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customerSetup.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
        cookAccepted: true,
        menuPriceCents: 25_000,
        travelExpensesCents: 2_000,
        paymentProviderFeeCents: 800,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 4_500,
        platformFeeCentsCustomer: 1_000,
        payoutCentsCook: 22_500,
        totalWithoutDiscountsCentsCustomer: 28_800,
        paymentStatus: 'EMPTY',
    });
    return { cookSetup, customerSetup, bookingRequestOfferId };
}

async function insertRoom(bookingRequestOfferId: string, createdByUserId: string) {
    const bookingRequestOfferCallRoomId = idCreate();
    await testDb.insert(bookingRequestOfferCallRooms).values({
        bookingRequestOfferCallRoomId,
        bookingRequestOfferId,
        livekitRoomName: `rec-${bookingRequestOfferCallRoomId}`,
        status: 'ENDED',
        createdByUserId,
    });
    return bookingRequestOfferCallRoomId;
}

describe('adminBookingRequestOfferCallRecordingsFindMany', () => {
    it('returns the offer recordings newest first', async () => {
        // Arrange
        const fixture = await seedOffer();
        const olderRoomId = await insertRoom(fixture.bookingRequestOfferId, fixture.cookSetup.user.userId);
        const newerRoomId = await insertRoom(fixture.bookingRequestOfferId, fixture.cookSetup.user.userId);
        const olderRecordingId = idCreate();
        const newerRecordingId = idCreate();
        await testDb.insert(bookingRequestOfferCallRecordings).values([
            {
                bookingRequestOfferCallRecordingId: olderRecordingId,
                bookingRequestOfferCallRoomId: olderRoomId,
                objectKey: `older-${olderRecordingId}.ogg`,
                status: 'COMPLETED',
                createdAt: new Date('2030-01-01T00:00:00.000Z'),
            },
            {
                bookingRequestOfferCallRecordingId: newerRecordingId,
                bookingRequestOfferCallRoomId: newerRoomId,
                objectKey: `newer-${newerRecordingId}.ogg`,
                status: 'PENDING',
                createdAt: new Date('2030-06-01T00:00:00.000Z'),
            },
        ]);

        // Act
        const rows = await adminBookingRequestOfferCallRecordingsFindMany(
            { bookingRequestOfferId: fixture.bookingRequestOfferId } as GqlSAdminBookingRequestOffer,
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestOfferCallRecordingId)).toEqual([newerRecordingId, olderRecordingId]);
        expect(rows[0]?.status).toBe('PENDING');
        expect(rows[1]?.status).toBe('COMPLETED');
    });

    it('excludes recordings that belong to another offer', async () => {
        // Arrange
        const fixture = await seedOffer();
        const other = await seedOffer();
        const roomId = await insertRoom(other.bookingRequestOfferId, other.cookSetup.user.userId);
        await testDb.insert(bookingRequestOfferCallRecordings).values({
            bookingRequestOfferCallRecordingId: idCreate(),
            bookingRequestOfferCallRoomId: roomId,
            objectKey: `other-${idCreate()}.ogg`,
            status: 'COMPLETED',
        });

        // Act
        const rows = await adminBookingRequestOfferCallRecordingsFindMany(
            { bookingRequestOfferId: fixture.bookingRequestOfferId } as GqlSAdminBookingRequestOffer,
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(rows).toEqual([]);
    });

    it('returns an empty list when the offer has no recordings', async () => {
        // Arrange
        const fixture = await seedOffer();
        await insertRoom(fixture.bookingRequestOfferId, fixture.cookSetup.user.userId);

        // Act
        const rows = await adminBookingRequestOfferCallRecordingsFindMany(
            { bookingRequestOfferId: fixture.bookingRequestOfferId } as GqlSAdminBookingRequestOffer,
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(rows).toEqual([]);
    });
});
