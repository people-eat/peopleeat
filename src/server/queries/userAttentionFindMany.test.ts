import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import type { GqlSUser } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userAttentionFindMany } from './userAttentionFindMany';

function userParent(userId: string): GqlSUser {
    return { userId } as unknown as GqlSUser;
}

async function insertRequestWithOffer(userId: string, userUnreadNotificationCount: number) {
    const cook = await commandSetup.withUser({ firstName: 'Offer', lastName: 'Chef' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId, isVisible: true, isApprovedByAdmin: true });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: {
            displayText: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            addressLine1: 'Street 1',
            addressLine2: '',
            city: 'Berlin',
            postCode: '10115',
            state: '',
            country: 'DE',
        },
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: true,
        userAccepted: null,
        menuPriceCents: 20_000,
        travelExpensesCents: 2_500,
        paymentProviderFeeCents: 500,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 0,
        platformFeeCentsCook: 3_600,
        platformFeeCentsCustomer: 0,
        payoutCentsCook: 18_400,
        totalWithoutDiscountsCentsCustomer: 23_000,
        paymentStatus: 'EMPTY',
        userUnreadNotificationCount,
    });
    return { bookingRequestId, bookingRequestOfferId, cookId: cook.user.userId };
}

describe('userAttentionFindMany', () => {
    it('derives to-dos from the customer’s requests and offers', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const { bookingRequestId, bookingRequestOfferId } = await insertRequestWithOffer(user.userId, 2);

        // Act
        const items = await userAttentionFindMany(userParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(items).toEqual([
            {
                kind: 'OFFERS_TO_REVIEW',
                count: 1,
                bookingRequestId,
                bookingRequestOfferId: null,
                occasion: 'Birthday',
                callStartAt: null,
                callEndAt: null,
            },
            {
                kind: 'OFFER_CHAT_UNREAD',
                count: 2,
                bookingRequestId,
                bookingRequestOfferId,
                occasion: 'Birthday',
                callStartAt: null,
                callEndAt: null,
            },
        ]);
    });

    it('asks the customer to answer a call the cook suggested', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const { bookingRequestOfferId, cookId } = await insertRequestWithOffer(user.userId, 0);
        const startAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        const endAt = new Date(startAt.getTime() + 15 * 60 * 1000);
        await testDb.insert(cookCallSlotBookings).values({
            cookCallSlotBookingId: idCreate(),
            cookId,
            userId: user.userId,
            bookingRequestOfferId,
            startAt,
            endAt,
            status: 'PENDING',
            initiator: 'COOK',
        });

        // Act
        const items = await userAttentionFindMany(userParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(items?.map((item) => item.kind)).toEqual(['OFFERS_TO_REVIEW', 'CALL_RESPONSE_NEEDED']);
        expect(items?.[1]).toMatchObject({ bookingRequestOfferId, callStartAt: startAt, callEndAt: endAt });
    });

    it('returns null for a foreign session', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const viewer = await commandSetup.withUser();
        await insertRequestWithOffer(owner.user.userId, 1);

        // Act
        const items = await userAttentionFindMany(userParent(owner.user.userId), viewer.requestingSession, viewer.serverRuntime);

        // Assert
        expect(items).toBeNull();
    });
});
