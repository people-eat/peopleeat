import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferCallRecordings,
    bookingRequestOfferCallRooms,
    bookingRequestOffers,
    bookingRequests,
    cooks,
    fileUploads,
    users,
} from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCallFindOne } from './adminCallFindOne';

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

async function seedRoom() {
    const cookSetup = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Cook' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });
    const customerSetup = await commandSetup.withUser({ firstName: 'Bea', lastName: 'Guest' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customerSetup.user.userId,
        occasion: 'Lunch',
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
    const bookingRequestOfferCallRoomId = idCreate();
    const startedAt = new Date('2031-05-01T10:00:00.000Z');
    await testDb.insert(bookingRequestOfferCallRooms).values({
        bookingRequestOfferCallRoomId,
        bookingRequestOfferId,
        livekitRoomName: `room-${bookingRequestOfferCallRoomId}`,
        status: 'ENDED',
        createdByUserId: cookSetup.user.userId,
        startedAt,
        endedAt: new Date('2031-05-01T10:30:00.000Z'),
    });
    return { cookSetup, customerSetup, bookingRequestId, bookingRequestOfferId, bookingRequestOfferCallRoomId, startedAt };
}

describe('adminCallFindOne', () => {
    it('returns null when the room id is unknown', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();

        // Act
        const result = await adminCallFindOne({ bookingRequestOfferCallRoomId: idCreate() }, requestingSession, serverRuntime);

        // Assert
        expect(result).toBeNull();
    });

    it('maps a room with a failed recording and no profile pictures', async () => {
        // Arrange
        const fixture = await seedRoom();
        const bookingRequestOfferCallRecordingId = idCreate();
        await testDb.insert(bookingRequestOfferCallRecordings).values({
            bookingRequestOfferCallRecordingId,
            bookingRequestOfferCallRoomId: fixture.bookingRequestOfferCallRoomId,
            objectKey: `calls/${bookingRequestOfferCallRecordingId}.ogg`,
            mediaType: 'audio/ogg',
            status: 'FAILED',
            errorMessage: 'egress failed',
        });

        // Act
        const result = await adminCallFindOne(
            { bookingRequestOfferCallRoomId: fixture.bookingRequestOfferCallRoomId },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(result).toMatchObject({
            bookingRequestOfferCallRoomId: fixture.bookingRequestOfferCallRoomId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            bookingRequestId: fixture.bookingRequestId,
            livekitRoomName: `room-${fixture.bookingRequestOfferCallRoomId}`,
            status: 'ENDED',
            startedAt: fixture.startedAt,
            endedAt: new Date('2031-05-01T10:30:00.000Z'),
            occasion: 'Lunch',
            cookId: fixture.cookSetup.user.userId,
            customerUserId: fixture.customerSetup.user.userId,
            cookDisplayName: 'Ada Cook',
            customerDisplayName: 'Bea Guest',
            cook: {
                userId: fixture.cookSetup.user.userId,
                displayName: 'Ada Cook',
                emailAddress: fixture.cookSetup.user.emailAddress,
                profilePicture: null,
            },
            customer: {
                userId: fixture.customerSetup.user.userId,
                displayName: 'Bea Guest',
                emailAddress: fixture.customerSetup.user.emailAddress,
                profilePicture: null,
            },
            recording: {
                bookingRequestOfferCallRecordingId,
                status: 'FAILED',
                audioUrl: null,
                errorMessage: 'egress failed',
                transcriptSegments: null,
            },
        });
    });

    it('maps a completed recording and profile pictures', async () => {
        // Arrange
        const fixture = await seedRoom();
        const cookUploadId = idCreate();
        const customerUploadId = idCreate();
        await testDb.insert(fileUploads).values([
            {
                fileUploadId: cookUploadId,
                userId: fixture.cookSetup.user.userId,
                filename: 'cook.jpg',
                mediaType: 'image/jpeg',
                size: 4,
                bytes: Buffer.from([1, 2, 3, 4]),
            },
            {
                fileUploadId: customerUploadId,
                userId: fixture.customerSetup.user.userId,
                filename: 'guest.jpg',
                mediaType: 'image/jpeg',
                size: 2,
                bytes: Buffer.from([5, 6]),
            },
        ]);
        await testDb.update(users).set({ profilePictureFileUploadId: cookUploadId }).where(eq(users.userId, fixture.cookSetup.user.userId));
        await testDb
            .update(users)
            .set({ profilePictureFileUploadId: customerUploadId })
            .where(eq(users.userId, fixture.customerSetup.user.userId));
        const bookingRequestOfferCallRecordingId = idCreate();
        await testDb.insert(bookingRequestOfferCallRecordings).values({
            bookingRequestOfferCallRecordingId,
            bookingRequestOfferCallRoomId: fixture.bookingRequestOfferCallRoomId,
            objectKey: `calls/${bookingRequestOfferCallRecordingId}.ogg`,
            mediaType: 'audio/ogg',
            byteSize: 1200,
            status: 'COMPLETED',
            transcriptText: 'Hello there',
            summaryText: 'A short hello',
            transcriptJson: [{ startedAtMs: 0, endedAtMs: 400, text: 'Hello there', speakerLabel: 'Cook' }],
        });

        // Act
        const result = await adminCallFindOne(
            { bookingRequestOfferCallRoomId: fixture.bookingRequestOfferCallRoomId },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(result?.cook.profilePicture).toMatchObject({
            fileUploadId: cookUploadId,
            filename: 'cook.jpg',
            mediaType: 'image/jpeg',
            size: 4,
        });
        expect(result?.customer.profilePicture).toMatchObject({
            fileUploadId: customerUploadId,
            filename: 'guest.jpg',
            mediaType: 'image/jpeg',
            size: 2,
        });
        expect(result?.recording).toMatchObject({
            bookingRequestOfferCallRecordingId,
            status: 'COMPLETED',
            byteSize: 1200,
            transcriptText: 'Hello there',
            summaryText: 'A short hello',
            audioUrl: `/api/admin/call-recordings/${bookingRequestOfferCallRecordingId}/audio`,
            transcriptSegments: [{ startedAtMs: 0, endedAtMs: 400, text: 'Hello there', speakerLabel: 'Cook' }],
        });
    });
});
