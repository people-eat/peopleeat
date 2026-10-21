import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    admins,
    bookingRequestOfferCallRecordings,
    bookingRequestOfferCallRooms,
    bookingRequestOffers,
    bookingRequests,
    cooks,
} from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferCallRecordingDelete } from './adminBookingRequestOfferCallRecordingDelete';

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

async function seedFailedRecording() {
    const admin = await commandSetup.withUser({ firstName: 'rec-del-admin', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });

    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Del' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_del',
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Del' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
        cookAccepted: true,
        userAccepted: true,
        menuPriceCents: 20_000,
        travelExpensesCents: 2_500,
        paymentProviderFeeCents: 500,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 0,
        platformFeeCentsCook: 3_600,
        platformFeeCentsCustomer: 0,
        payoutCentsCook: 18_400,
        totalWithoutDiscountsCentsCustomer: 23_000,
        totalCentsCustomer: 23_000,
        paymentStatus: 'PAYED',
    });

    const bookingRequestOfferCallRoomId = idCreate();
    await testDb.insert(bookingRequestOfferCallRooms).values({
        bookingRequestOfferCallRoomId,
        bookingRequestOfferId,
        livekitRoomName: `test-room-${bookingRequestOfferCallRoomId}`,
        status: 'ENDED',
        createdByUserId: customer.user.userId,
        endedAt: new Date(),
    });

    const bookingRequestOfferCallRecordingId = idCreate();
    const objectKey = `call-recordings/${bookingRequestOfferCallRoomId}.ogg`;
    await testDb.insert(bookingRequestOfferCallRecordings).values({
        bookingRequestOfferCallRecordingId,
        bookingRequestOfferCallRoomId,
        livekitEgressId: 'EG_failed',
        objectKey,
        mediaType: 'audio/ogg',
        status: 'FAILED',
        errorMessage: 'LiveKit egress did not complete in time',
        completedAt: new Date(),
    });

    return {
        admin,
        bookingRequestOfferCallRecordingId,
        bookingRequestOfferCallRoomId,
        objectKey,
    };
}

describe('adminBookingRequestOfferCallRecordingDelete', () => {
    it('deletes a FAILED recording, Garage object, and publishes adminUpdates', async () => {
        const { admin, bookingRequestOfferCallRecordingId, bookingRequestOfferCallRoomId, objectKey } = await seedFailedRecording();
        vi.mocked(admin.serverRuntime.objectStorage.isConfigured).mockReturnValue(true);

        const result = await adminBookingRequestOfferCallRecordingDelete(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferCallRecordingId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferCallRecordingId });
        expect(admin.serverRuntime.objectStorage.deleteObject).toHaveBeenCalledWith(objectKey);

        const recordings = await testDb
            .select()
            .from(bookingRequestOfferCallRecordings)
            .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, bookingRequestOfferCallRecordingId));
        expect(recordings).toHaveLength(0);

        const rooms = await testDb
            .select()
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, bookingRequestOfferCallRoomId));
        expect(rooms).toHaveLength(1);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects non-FAILED recordings', async () => {
        const { admin, bookingRequestOfferCallRecordingId } = await seedFailedRecording();
        await testDb
            .update(bookingRequestOfferCallRecordings)
            .set({ status: 'COMPLETED', errorMessage: null })
            .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, bookingRequestOfferCallRecordingId));

        await expect(
            adminBookingRequestOfferCallRecordingDelete(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferCallRecordingId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/only FAILED/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows.some((row) => row.level === 'error')).toBe(true);
    });

    it('throws when the recording is missing', async () => {
        const admin = await commandSetup.withUser({ firstName: 'rec-del-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const bookingRequestOfferCallRecordingId = idCreate();

        await expect(
            adminBookingRequestOfferCallRecordingDelete(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferCallRecordingId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/recording not found/);
    });
});
