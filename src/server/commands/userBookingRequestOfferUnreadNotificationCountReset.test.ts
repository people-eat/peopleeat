import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { BookingRequestCreate } from '../db/schema';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { cookBookingRequestOfferCreate } from './cookBookingRequestOfferCreate';
import { userBookingRequestOfferUnreadNotificationCountReset } from './userBookingRequestOfferUnreadNotificationCountReset';

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

async function setupCookReadyToOffer() {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Offer' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_test',
        stripeAccountActive: true,
    });
    return setup;
}

async function insertCustomerBookingRequest(overrides: Partial<BookingRequestCreate> = {}) {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: {
            ...berlin,
            latitude: 52.53,
            longitude: 13.41,
        },
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        ...overrides,
    });
    return { customer, bookingRequestId };
}

describe('userBookingRequestOfferUnreadNotificationCountReset', () => {
    it('clears the customer unread counter', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();

        const created = await cookBookingRequestOfferCreate(
            cookMutationParent(cook.user.userId),
            { input: { bookingRequestId, suggestedMenuIds: [], menuPriceCents: 20_000 } },
            cook.requestingSession,
            cook.serverRuntime,
        );
        const bookingRequestOfferId = created.referenceId!;

        await testDb
            .update(bookingRequestOffers)
            .set({ userUnreadNotificationCount: 3, cookUnreadNotificationCount: 2 })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        const result = await userBookingRequestOfferUnreadNotificationCountReset(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.userUnreadNotificationCount).toBe(0);
        expect(offer?.cookUnreadNotificationCount).toBe(2);
    });
});
