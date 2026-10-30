import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookAttentionCountsFindOne } from './cookAttentionCountsFindOne';
import { cookBookingRequestFindMany } from './cookBookingRequestFindMany';

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

/** Remote origin + tight radius so pool rows from parallel tests (Berlin) never count. */
function remoteAddress() {
    const latitude = -60 + Math.random() * 10;
    const longitude = -150 + Math.random() * 10;
    return {
        displayText: 'Remote',
        latitude,
        longitude,
        addressLine1: 'Street 1',
        addressLine2: '',
        city: 'Remote',
        postCode: '00000',
        state: '',
        country: 'XX',
    };
}

async function setupPoolCook() {
    const setup = await commandSetup.withUser({ firstName: 'Badge', lastName: 'Chef' });
    const origin = remoteAddress();
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: origin,
        maximumTravelDistance: 5,
    });
    return { ...setup, origin };
}

async function insertBookingRequest(address: ReturnType<typeof remoteAddress>) {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: address,
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    return bookingRequestId;
}

async function insertOffer(cookId: string, cookUnreadNotificationCount: number) {
    const bookingRequestId = await insertBookingRequest(remoteAddress());
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId: idCreate(),
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
}

describe('cookAttentionCountsFindOne', () => {
    it('counts the open pool like the pool list, sums offer unread, and flags an incomplete wallet', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user, origin } = await setupPoolCook();
        const nearby = { ...origin, latitude: origin.latitude + 0.001 };
        await insertBookingRequest(nearby);
        await insertBookingRequest(nearby);
        const declinedId = await insertBookingRequest(nearby);
        await testDb.insert(bookingRequestCooks).values({
            cookId: user.userId,
            bookingRequestId: declinedId,
            declinedAt: new Date(),
            declinationReason: 'Not available',
        });
        await insertOffer(user.userId, 2);
        await insertOffer(user.userId, 3);

        // Act
        const counts = await cookAttentionCountsFindOne(cookParent(user.userId), requestingSession, serverRuntime);
        const poolList = await cookBookingRequestFindMany(
            cookParent(user.userId),
            { criterion: { onlyDeclined: false } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(counts).toEqual({ bookingRequestPoolCount: 2, bookingRequestOfferUnreadCount: 5, walletNeedsAttention: true });
        expect(counts.bookingRequestPoolCount).toBe(poolList.length);
    });

    it('returns zeros and no wallet flag for an unapproved cook without activity', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'New', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: setup.user.userId, isApprovedByAdmin: false });

        // Act
        const counts = await cookAttentionCountsFindOne(cookParent(setup.user.userId), setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(counts).toEqual({ bookingRequestPoolCount: 0, bookingRequestOfferUnreadCount: 0, walletNeedsAttention: false });
    });
});
