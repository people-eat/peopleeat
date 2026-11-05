import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferCallRooms, bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCallsFindMany } from './adminCallsFindMany';

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

async function seedOffer(cookFirstName: string, customerFirstName: string, occasion: string) {
    const cookSetup = await commandSetup.withUser({ firstName: cookFirstName, lastName: 'Calls' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });
    const customerSetup = await commandSetup.withUser({ firstName: customerFirstName, lastName: 'Calls' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customerSetup.user.userId,
        occasion,
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
    return { cookSetup, customerSetup, bookingRequestId, bookingRequestOfferId };
}

describe('adminCallsFindMany', () => {
    it('returns live, pending, upcoming, recent room, and recent slot rows in hub order', async () => {
        // Arrange
        const occasion = `Calls-${idCreate()}`;
        const fixture = await seedOffer('Nia', 'Omar', occasion);
        const now = Date.now();
        const liveLaterId = idCreate();
        const liveEarlierId = idCreate();
        await testDb.insert(bookingRequestOfferCallRooms).values([
            {
                bookingRequestOfferCallRoomId: liveLaterId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                livekitRoomName: `live-later-${liveLaterId}`,
                status: 'ACTIVE',
                createdByUserId: fixture.cookSetup.user.userId,
                startedAt: new Date(now - 60_000),
            },
            {
                bookingRequestOfferCallRoomId: liveEarlierId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                livekitRoomName: `live-earlier-${liveEarlierId}`,
                status: 'ACTIVE',
                createdByUserId: fixture.cookSetup.user.userId,
                startedAt: new Date(now - 120_000),
            },
        ]);

        const pendingSoonId = idCreate();
        const pendingLaterId = idCreate();
        const joinableId = idCreate();
        const upcomingId = idCreate();
        const recentSlotId = idCreate();
        await testDb.insert(cookCallSlotBookings).values([
            {
                cookCallSlotBookingId: pendingSoonId,
                cookId: fixture.cookSetup.user.userId,
                userId: fixture.customerSetup.user.userId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                initiator: 'CUSTOMER',
                status: 'PENDING',
                startAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
                endAt: new Date(now + 2 * 24 * 60 * 60 * 1000 + 30 * 60_000),
            },
            {
                cookCallSlotBookingId: pendingLaterId,
                cookId: fixture.cookSetup.user.userId,
                userId: fixture.customerSetup.user.userId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                initiator: 'COOK',
                status: 'PENDING',
                startAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
                endAt: new Date(now + 3 * 24 * 60 * 60 * 1000 + 30 * 60_000),
            },
            {
                cookCallSlotBookingId: joinableId,
                cookId: fixture.cookSetup.user.userId,
                userId: fixture.customerSetup.user.userId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                initiator: 'CUSTOMER',
                status: 'CONFIRMED',
                startAt: new Date(now - 20 * 60_000),
                endAt: new Date(now + 20 * 60_000),
            },
            {
                cookCallSlotBookingId: upcomingId,
                cookId: fixture.cookSetup.user.userId,
                userId: fixture.customerSetup.user.userId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                initiator: 'CUSTOMER',
                status: 'CONFIRMED',
                startAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
                endAt: new Date(now + 2 * 24 * 60 * 60 * 1000 + 30 * 60_000),
            },
            {
                cookCallSlotBookingId: recentSlotId,
                cookId: fixture.cookSetup.user.userId,
                userId: fixture.customerSetup.user.userId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                initiator: 'CUSTOMER',
                status: 'COMPLETED',
                startAt: new Date(now - 3 * 60 * 60 * 1000),
                endAt: new Date(now - 2 * 60 * 60 * 1000),
                lastModifiedAt: new Date(now - 30 * 60_000),
            },
        ]);

        const recentRoomId = idCreate();
        await testDb.insert(bookingRequestOfferCallRooms).values({
            bookingRequestOfferCallRoomId: recentRoomId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            livekitRoomName: `recent-${recentRoomId}`,
            status: 'ENDED',
            createdByUserId: fixture.customerSetup.user.userId,
            startedAt: new Date(now - 2 * 60 * 60 * 1000),
            endedAt: new Date(now - 60 * 60 * 1000),
        });

        // Act
        const items = await adminCallsFindMany(null, fixture.cookSetup.requestingSession, fixture.cookSetup.serverRuntime);

        // Assert
        const ours = items.filter((item) => item.bookingRequestOfferId === fixture.bookingRequestOfferId);
        expect(ours.map((item) => item.kind)).toEqual([
            'LIVE',
            'LIVE',
            'PENDING',
            'PENDING',
            'UPCOMING',
            'UPCOMING',
            'RECENT_ROOM',
            'RECENT_SLOT',
        ]);
        expect(ours.map((item) => item.callRoom?.bookingRequestOfferCallRoomId ?? item.callSlotBooking?.cookCallSlotBookingId)).toEqual([
            liveLaterId,
            liveEarlierId,
            pendingSoonId,
            pendingLaterId,
            joinableId,
            upcomingId,
            recentRoomId,
            recentSlotId,
        ]);
        expect(ours[0]).toMatchObject({
            cookDisplayName: 'Nia',
            customerDisplayName: 'Omar',
            occasion,
            cookId: fixture.cookSetup.user.userId,
            customerUserId: fixture.customerSetup.user.userId,
            bookingRequestId: fixture.bookingRequestId,
        });
    });

    it('omits stale, far, declined, and not-yet-finished rows', async () => {
        // Arrange
        const fixture = await seedOffer('Pia', 'Quinn', `Calls-omit-${idCreate()}`);
        const now = Date.now();
        const oldRoomId = idCreate();
        const pastPendingId = idCreate();
        const farConfirmedId = idCreate();
        const futureCompletedId = idCreate();
        const oldCompletedId = idCreate();
        const declinedId = idCreate();
        await testDb.insert(bookingRequestOfferCallRooms).values({
            bookingRequestOfferCallRoomId: oldRoomId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            livekitRoomName: `old-${oldRoomId}`,
            status: 'ENDED',
            createdByUserId: fixture.cookSetup.user.userId,
            startedAt: new Date(now - 50 * 60 * 60 * 1000),
            endedAt: new Date(now - 49 * 60 * 60 * 1000),
        });
        await testDb.insert(cookCallSlotBookings).values([
            {
                cookCallSlotBookingId: pastPendingId,
                cookId: fixture.cookSetup.user.userId,
                userId: fixture.customerSetup.user.userId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                initiator: 'CUSTOMER',
                status: 'PENDING',
                startAt: new Date(now - 24 * 60 * 60 * 1000),
                endAt: new Date(now - 23 * 60 * 60 * 1000),
            },
            {
                cookCallSlotBookingId: farConfirmedId,
                cookId: fixture.cookSetup.user.userId,
                userId: fixture.customerSetup.user.userId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                initiator: 'CUSTOMER',
                status: 'CONFIRMED',
                startAt: new Date(now + 10 * 24 * 60 * 60 * 1000),
                endAt: new Date(now + 10 * 24 * 60 * 60 * 1000 + 30 * 60_000),
            },
            {
                cookCallSlotBookingId: futureCompletedId,
                cookId: fixture.cookSetup.user.userId,
                userId: fixture.customerSetup.user.userId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                initiator: 'CUSTOMER',
                status: 'COMPLETED',
                startAt: new Date(now + 60 * 60 * 1000),
                endAt: new Date(now + 2 * 60 * 60 * 1000),
                lastModifiedAt: new Date(now - 10 * 60_000),
            },
            {
                cookCallSlotBookingId: oldCompletedId,
                cookId: fixture.cookSetup.user.userId,
                userId: fixture.customerSetup.user.userId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                initiator: 'CUSTOMER',
                status: 'COMPLETED',
                startAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
                endAt: new Date(now - 5 * 24 * 60 * 60 * 1000 + 30 * 60_000),
                lastModifiedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
            },
            {
                cookCallSlotBookingId: declinedId,
                cookId: fixture.cookSetup.user.userId,
                userId: fixture.customerSetup.user.userId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                initiator: 'COOK',
                status: 'DECLINED',
                startAt: new Date(now + 24 * 60 * 60 * 1000),
                endAt: new Date(now + 24 * 60 * 60 * 1000 + 30 * 60_000),
            },
        ]);

        // Act
        const items = await adminCallsFindMany(null, fixture.cookSetup.requestingSession, fixture.cookSetup.serverRuntime);

        // Assert
        const ids = items
            .filter((item) => item.bookingRequestOfferId === fixture.bookingRequestOfferId)
            .map((item) => item.callRoom?.bookingRequestOfferCallRoomId ?? item.callSlotBooking?.cookCallSlotBookingId);
        expect(ids).toEqual([]);
    });
});
