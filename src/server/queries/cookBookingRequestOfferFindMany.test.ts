import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookBookingRequestOfferFindMany } from './cookBookingRequestOfferFindMany';
import { cookBookingRequestOfferFindOne } from './cookBookingRequestOfferFindOne';

const berlin = {
    displayText: 'Street 1, 10115 Berlin, Germany',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

async function insertOffer(cookId: string) {
    const customer = await commandSetup.withUser({ firstName: 'customer', lastName: 'User' });
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
    });
    return { bookingRequestOfferId, bookingRequestId };
}

describe('cookBookingRequestOfferFindMany', () => {
    it("returns the cook's offers with hydrated defaults", async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestOfferId } = await insertOffer(user.userId);

        // Act
        const rows = await cookBookingRequestOfferFindMany(cookParent(user.userId), {}, requestingSession, serverRuntime);

        // Assert
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            bookingRequestOfferId,
            cookId: user.userId,
            menuPriceCents: 20_000,
            suggestedMenus: [],
            callBookings: [],
        });
    });

    it("excludes another cook's offers", async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const other = await setupCook();
        await insertOffer(other.user.userId);

        // Act
        const rows = await cookBookingRequestOfferFindMany(cookParent(user.userId), {}, requestingSession, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });

    it('filters by ACTIVE bucket for an in-flight offer', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestOfferId } = await insertOffer(user.userId);

        // Act
        const active = await cookBookingRequestOfferFindMany(
            cookParent(user.userId),
            { criterion: { bucket: 'ACTIVE' } },
            requestingSession,
            serverRuntime,
        );
        const completed = await cookBookingRequestOfferFindMany(
            cookParent(user.userId),
            { criterion: { bucket: 'COMPLETED' } },
            requestingSession,
            serverRuntime,
        );
        const archived = await cookBookingRequestOfferFindMany(
            cookParent(user.userId),
            { criterion: { bucket: 'ARCHIVED' } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(active.map((offer) => offer.bookingRequestOfferId)).toEqual([bookingRequestOfferId]);
        expect(completed).toEqual([]);
        expect(archived).toEqual([]);
    });
});

describe('cookBookingRequestOfferFindOne', () => {
    it('returns the matching offer on a hit', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestOfferId } = await insertOffer(user.userId);

        // Act
        const row = await cookBookingRequestOfferFindOne(
            cookParent(user.userId),
            { bookingRequestOfferId },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(row?.bookingRequestOfferId).toBe(bookingRequestOfferId);
        expect(row?.bookingRequest.exactEventAddress.addressLine1).toBe('');
        expect(row?.bookingRequest.exactEventAddress.displayText).toBe('10115 Berlin');
    });

    it('reveals the exact venue after dual-accept', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestOfferId } = await insertOffer(user.userId);
        await testDb
            .update(bookingRequestOffers)
            .set({ userAccepted: true, cookAccepted: true })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        const row = await cookBookingRequestOfferFindOne(
            cookParent(user.userId),
            { bookingRequestOfferId },
            requestingSession,
            serverRuntime,
        );

        expect(row?.bookingRequest.exactEventAddress.addressLine1).toBe('Street 1');
        expect(row?.bookingRequest.exactEventAddress.displayText).toBe(berlin.displayText);
    });

    it('returns null when the offer id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        await insertOffer(user.userId);

        // Act
        const row = await cookBookingRequestOfferFindOne(
            cookParent(user.userId),
            { bookingRequestOfferId: idCreate() },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(row).toBeNull();
    });
});
