import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferCallRooms, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestOfferCallRoomFindActive } from './bookingRequestOfferCallRoomFindActive';

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
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'ActiveRoom' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });
    const customerSetup = await commandSetup.withUser({ firstName: 'Guest', lastName: 'ActiveRoom' });
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
    return { cookSetup, bookingRequestOfferId };
}

describe('bookingRequestOfferCallRoomFindActive', () => {
    it('returns the active room for the offer', async () => {
        // Arrange
        const fixture = await seedOffer();
        const bookingRequestOfferCallRoomId = idCreate();
        await testDb.insert(bookingRequestOfferCallRooms).values({
            bookingRequestOfferCallRoomId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            livekitRoomName: `active-${bookingRequestOfferCallRoomId}`,
            status: 'ACTIVE',
            createdByUserId: fixture.cookSetup.user.userId,
        });

        // Act
        const room = await bookingRequestOfferCallRoomFindActive(fixture.cookSetup.serverRuntime.db, fixture.bookingRequestOfferId);

        // Assert
        expect(room?.bookingRequestOfferCallRoomId).toBe(bookingRequestOfferCallRoomId);
        expect(room?.status).toBe('ACTIVE');
    });

    it('returns null when the only room has ended', async () => {
        // Arrange
        const fixture = await seedOffer();
        await testDb.insert(bookingRequestOfferCallRooms).values({
            bookingRequestOfferCallRoomId: idCreate(),
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            livekitRoomName: `ended-${idCreate()}`,
            status: 'ENDED',
            createdByUserId: fixture.cookSetup.user.userId,
            endedAt: new Date(),
        });

        // Act
        const room = await bookingRequestOfferCallRoomFindActive(fixture.cookSetup.serverRuntime.db, fixture.bookingRequestOfferId);

        // Assert
        expect(room).toBeNull();
    });

    it('returns null for an unknown offer id', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        const room = await bookingRequestOfferCallRoomFindActive(serverRuntime.db, idCreate());

        // Assert
        expect(room).toBeNull();
    });

    it('returns the active room when an ended room also exists', async () => {
        // Arrange
        const fixture = await seedOffer();
        const activeId = idCreate();
        await testDb.insert(bookingRequestOfferCallRooms).values([
            {
                bookingRequestOfferCallRoomId: idCreate(),
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                livekitRoomName: `ended-${idCreate()}`,
                status: 'ENDED',
                createdByUserId: fixture.cookSetup.user.userId,
                endedAt: new Date(),
            },
            {
                bookingRequestOfferCallRoomId: activeId,
                bookingRequestOfferId: fixture.bookingRequestOfferId,
                livekitRoomName: `active-${activeId}`,
                status: 'ACTIVE',
                createdByUserId: fixture.cookSetup.user.userId,
            },
        ]);

        // Act
        const room = await bookingRequestOfferCallRoomFindActive(fixture.cookSetup.serverRuntime.db, fixture.bookingRequestOfferId);

        // Assert
        expect(room?.bookingRequestOfferCallRoomId).toBe(activeId);
    });
});
