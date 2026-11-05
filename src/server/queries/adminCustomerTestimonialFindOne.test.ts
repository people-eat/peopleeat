import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cities, cityTestimonials, cooks, customerTestimonials } from '../db/schema';
import { commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminCustomerTestimonialFindOne } from './adminCustomerTestimonialFindOne';

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
    return { cook, customer, bookingRequestOfferId };
}

describe('adminCustomerTestimonialFindOne', () => {
    it('returns the mapped row when it has no offer and no placements', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Guest' });
        const customerTestimonialId = idCreate();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId,
            userId: user.userId,
            authorName: 'Ada',
            location: 'Hamburg',
            occasion: 'Lunch',
            body: 'Standalone',
            rating: 5,
            publicationStatus: 'PENDING_REVIEW',
        });

        // Act
        const row = await adminCustomerTestimonialFindOne({ customerTestimonialId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            gqlTypeName: 'AdminCustomerTestimonial',
            customerTestimonialId,
            userId: user.userId,
            bookingRequestOfferId: null,
            authorName: 'Ada',
            displayAuthorName: 'Ada',
            location: 'Hamburg',
            displayLocation: 'Hamburg',
            occasion: 'Lunch',
            displayOccasion: 'Lunch',
            body: 'Standalone',
            imageUrls: [],
            rating: 5,
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
            publicPagePlacements: [],
        });
    });

    it('adds city and chef placements for a published offer-linked review', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const { cook, customer, bookingRequestOfferId } = await seedOffer();
        const customerTestimonialId = idCreate();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId,
            userId: customer.user.userId,
            bookingRequestOfferId,
            body: 'Linked',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date('2024-06-02T00:00:00.000Z'),
        });
        const cityId = idCreate();
        const token = cityId.slice(0, 8);
        await testDb.insert(cities).values({
            cityId,
            nameDe: 'Berlin',
            nameEn: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            pathName: `customer-find-${token}`,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        await testDb.insert(cityTestimonials).values({
            cityId,
            testimonialType: 'CUSTOMER',
            testimonialId: customerTestimonialId,
            index: 0,
        });

        // Act
        const row = await adminCustomerTestimonialFindOne({ customerTestimonialId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            bookingRequestOfferId,
            displayAuthorName: 'Ada',
            displayLocation: 'Berlin',
            displayOccasion: 'Dinner',
            publicationStatus: 'PUBLISHED',
            publicPagePlacements: [
                {
                    kind: 'CITY',
                    entityId: cityId,
                    labelDe: 'Berlin',
                    labelEn: 'Berlin',
                    pathName: `customer-find-${token}`,
                    index: 0,
                },
                {
                    kind: 'CHEF',
                    entityId: cook.user.userId,
                    labelDe: 'Nia Chef',
                    labelEn: 'Nia Chef',
                    pathName: null,
                    index: null,
                },
            ],
        });
    });

    it('omits the chef placement while the offer-linked review is pending', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const { customer, bookingRequestOfferId } = await seedOffer();
        const customerTestimonialId = idCreate();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId,
            userId: customer.user.userId,
            bookingRequestOfferId,
            body: 'Waiting',
            rating: 2,
            publicationStatus: 'PENDING_REVIEW',
        });
        const cityId = idCreate();
        const token = cityId.slice(0, 8);
        await testDb.insert(cities).values({
            cityId,
            nameDe: 'Berlin',
            nameEn: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            pathName: `customer-pending-${token}`,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        await testDb.insert(cityTestimonials).values({
            cityId,
            testimonialType: 'CUSTOMER',
            testimonialId: customerTestimonialId,
            index: 1,
        });

        // Act
        const row = await adminCustomerTestimonialFindOne({ customerTestimonialId }, requestingSession, serverRuntime);

        // Assert
        expect(row!.publicationStatus).toBe('PENDING_REVIEW');
        expect(row!.publicPagePlacements).toEqual([
            {
                kind: 'CITY',
                entityId: cityId,
                labelDe: 'Berlin',
                labelEn: 'Berlin',
                pathName: `customer-pending-${token}`,
                index: 1,
            },
        ]);
    });

    it('returns null for an unknown id and does not log', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const row = await adminCustomerTestimonialFindOne({ customerTestimonialId: idCreate() }, requestingSession, serverRuntime);

        // Assert
        expect(row).toBeNull();
        expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
    });
});
