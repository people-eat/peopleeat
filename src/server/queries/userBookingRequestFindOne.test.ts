import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { GqlSUser } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userBookingRequestFindOne } from './userBookingRequestFindOne';

const sampleAddress = {
    displayText: 'Musterstraße 1, 80331 München',
    latitude: 48.137,
    longitude: 11.575,
    addressLine1: 'Musterstraße 1',
    addressLine2: '',
    city: 'München',
    postCode: '80331',
    state: 'BY',
    country: 'DE',
};

function userParent(userId: string, locale: GqlSUser['locale'] = 'de'): GqlSUser {
    return { userId, locale } as unknown as GqlSUser;
}

async function insertBookingRequest(userId: string) {
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: sampleAddress,
        priceClassType: 'MEDIUM',
        originalMessage: 'Please cook for us.',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    return { bookingRequestId };
}

async function insertOffer(bookingRequestId: string, cookId: string) {
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
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 3_600,
        platformFeeCentsCustomer: 900,
        payoutCentsCook: 18_400,
        totalWithoutDiscountsCentsCustomer: 23_900,
        paymentStatus: 'EMPTY',
    });
    return bookingRequestOfferId;
}

describe('userBookingRequestFindOne', () => {
    it('returns the mapped booking request for the owner on a hit', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const { bookingRequestId } = await insertBookingRequest(user.userId);

        // Act
        const row = await userBookingRequestFindOne(userParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({ bookingRequestId, userId: user.userId, occasion: 'Birthday' });
    });

    it('returns null when the booking request id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();

        // Act
        const row = await userBookingRequestFindOne(
            userParent(user.userId),
            { bookingRequestId: idCreate() },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(row).toBeNull();
    });

    it('returns null when the requesting session belongs to a different user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const { bookingRequestId } = await insertBookingRequest(owner.user.userId);

        // Act
        const row = await userBookingRequestFindOne(
            userParent(owner.user.userId),
            { bookingRequestId },
            other.requestingSession,
            other.serverRuntime,
        );

        // Assert
        expect(row).toBeNull();
    });

    it('localizes offer cost breakdown titles from the viewer locale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ locale: 'en' });
        const cook = await commandSetup.withUser({ firstName: 'Offer', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId, isVisible: true, isApprovedByAdmin: true });
        const { bookingRequestId } = await insertBookingRequest(user.userId);
        await insertOffer(bookingRequestId, cook.user.userId);

        // Act
        const row = await userBookingRequestFindOne(userParent(user.userId, 'en'), { bookingRequestId }, requestingSession, serverRuntime);

        // Assert
        const lineTitles = row?.offers[0]?.costBreakdown.lineItems.map((line) => line.title) ?? [];
        expect(lineTitles).toEqual(expect.arrayContaining(['Menu price', 'Service fees']));
        expect(row?.offers[0]?.costBreakdown.total?.title).toBe('Total price');
        expect(lineTitles).not.toEqual(expect.arrayContaining(['Menüpreis', 'Servicegebühren']));
    });
});
