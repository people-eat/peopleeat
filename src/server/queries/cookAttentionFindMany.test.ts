import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookAttentionFindMany } from './cookAttentionFindMany';

const DAY_MS = 24 * 60 * 60 * 1000;

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

async function insertOffer(cookId: string, customerUserId: string, cookUnreadNotificationCount: number) {
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customerUserId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 30 * DAY_MS),
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
        cookId,
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
        cookUnreadNotificationCount,
    });
    return bookingRequestOfferId;
}

async function insertCall(cookId: string, userId: string, bookingRequestOfferId: string, startAt: Date) {
    await testDb.insert(cookCallSlotBookings).values({
        cookCallSlotBookingId: idCreate(),
        cookId,
        userId,
        bookingRequestOfferId,
        startAt,
        endAt: new Date(startAt.getTime() + 15 * 60 * 1000),
        status: 'CONFIRMED',
        initiator: 'CUSTOMER',
    });
}

describe('cookAttentionFindMany', () => {
    it('surfaces unread offer chat and the next call within two weeks', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Attention', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: user.userId, isApprovedByAdmin: true });
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Guest' });
        const quietOfferId = await insertOffer(user.userId, customer.user.userId, 0);
        const chattyOfferId = await insertOffer(user.userId, customer.user.userId, 3);
        const nextCallAt = new Date(Date.now() + 2 * DAY_MS);
        await insertCall(user.userId, customer.user.userId, quietOfferId, nextCallAt);
        await insertCall(user.userId, customer.user.userId, chattyOfferId, new Date(Date.now() + 20 * DAY_MS));

        // Act
        const items = await cookAttentionFindMany(cookParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(items).toEqual([
            { kind: 'OFFER_CHAT_UNREAD', count: 3, bookingRequestOfferId: chattyOfferId, callStartAt: null, customerDisplay: null },
            { kind: 'CALL_UPCOMING', count: 1, bookingRequestOfferId: quietOfferId, callStartAt: nextCallAt, customerDisplay: 'Ada' },
        ]);
    });

    it('only flags pending approval for a new cook', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'New', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: setup.user.userId, isApprovedByAdmin: false });

        // Act
        const items = await cookAttentionFindMany(cookParent(setup.user.userId), setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(items.map((item) => item.kind)).toEqual(['APPROVAL_PENDING']);
    });
});
