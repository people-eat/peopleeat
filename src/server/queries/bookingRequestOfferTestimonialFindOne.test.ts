import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, cookTestimonials, customerTestimonials } from '../db/schema';
import type { GqlSCookBookingRequestOffer, GqlSUserBookingRequestOffer } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookBookingRequestOfferCookTestimonialFindOne } from './cookBookingRequestOfferCookTestimonialFindOne';
import { userBookingRequestOfferCustomerTestimonialFindOne } from './userBookingRequestOfferCustomerTestimonialFindOne';

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

const offerFees = {
    menuPriceCents: 20_000,
    travelExpensesCents: 0,
    paymentProviderFeeCents: 0,
    platformFeePercentCook: 18,
    platformFeePercentCustomer: 0,
    platformFeeCentsCook: 3_600,
    platformFeeCentsCustomer: 0,
    payoutCentsCook: 16_400,
    totalWithoutDiscountsCentsCustomer: 20_000,
    paymentStatus: 'EMPTY' as const,
};

async function seedOffer() {
    const cook = await commandSetup.withUser({ firstName: 'Nia', lastName: 'Chef' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId });
    const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Guest' });
    const bookingRequestId = idCreate();
    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date('2024-06-01T18:00:00.000Z'),
        exactEventAddress: berlin,
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        ...offerFees,
    });
    return { serverRuntime: customer.serverRuntime, cook, customer, bookingRequestOfferId };
}

describe('cookBookingRequestOfferCookTestimonialFindOne', () => {
    it('returns the cook review for the offer, including a pending row, with offer fallbacks', async () => {
        // Arrange
        const { serverRuntime, cook, bookingRequestOfferId } = await seedOffer();
        const cookTestimonialId = idCreate();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId,
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            body: 'Pending cook note',
            rating: 2,
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
            createdAt: new Date('2024-07-01T00:00:00.000Z'),
        });

        // Act
        const row = await cookBookingRequestOfferCookTestimonialFindOne(
            { bookingRequestOfferId } as GqlSCookBookingRequestOffer,
            serverRuntime,
        );

        // Assert
        expect(row).toMatchObject({
            gqlTypeName: 'CookTestimonial',
            cookTestimonialId,
            authorName: 'Nia',
            authorProfilePicture: null,
            location: 'Berlin',
            occasion: 'Dinner',
            body: 'Pending cook note',
            imageUrls: [],
            rating: 2,
            publishedAt: null,
        });
    });

    it('returns null when the offer id has no cook testimonial', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        const row = await cookBookingRequestOfferCookTestimonialFindOne(
            { bookingRequestOfferId: idCreate() } as GqlSCookBookingRequestOffer,
            serverRuntime,
        );

        // Assert
        expect(row).toBeNull();
    });
});

describe('userBookingRequestOfferCustomerTestimonialFindOne', () => {
    it('returns the customer review for the offer, including a pending row, with offer fallbacks', async () => {
        // Arrange
        const { serverRuntime, customer, bookingRequestOfferId } = await seedOffer();
        const customerTestimonialId = idCreate();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId,
            userId: customer.user.userId,
            bookingRequestOfferId,
            authorName: 'Ada wrote this',
            body: 'Pending customer note',
            imageUrls: ['/plate'],
            rating: 3,
            publicationStatus: 'PENDING_REVIEW',
            createdAt: new Date('2024-07-02T00:00:00.000Z'),
        });

        // Act
        const row = await userBookingRequestOfferCustomerTestimonialFindOne(
            { bookingRequestOfferId } as GqlSUserBookingRequestOffer,
            serverRuntime,
        );

        // Assert
        expect(row).toMatchObject({
            gqlTypeName: 'CustomerTestimonial',
            customerTestimonialId,
            authorName: 'Ada wrote this',
            authorProfilePicture: null,
            location: 'Berlin',
            occasion: 'Dinner',
            body: 'Pending customer note',
            imageUrls: ['/plate'],
            rating: 3,
            publishedAt: null,
        });
    });

    it('returns null when the offer id has no customer testimonial', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        const row = await userBookingRequestOfferCustomerTestimonialFindOne(
            { bookingRequestOfferId: idCreate() } as GqlSUserBookingRequestOffer,
            serverRuntime,
        );

        // Assert
        expect(row).toBeNull();
    });
});
