import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cities, cityTestimonials, cooks, cookTestimonials } from '../db/schema';
import { commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminCookTestimonialFindOne } from './adminCookTestimonialFindOne';

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

describe('adminCookTestimonialFindOne', () => {
    it('returns the mapped row when it has no offer and no placements', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Nia', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const cookTestimonialId = idCreate();
        const createdAt = new Date('2024-01-04T00:00:00.000Z');
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId,
            userId: user.userId,
            cookId: user.userId,
            authorName: 'Nia',
            location: 'Hamburg',
            occasion: 'Lunch',
            body: 'Standalone',
            rating: 5,
            lowRatingAnswers: { whatWentWrong: 'None' },
            publicationStatus: 'PUBLISHED',
            publishedAt: createdAt,
            createdAt,
        });

        // Act
        const row = await adminCookTestimonialFindOne({ cookTestimonialId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            gqlTypeName: 'AdminCookTestimonial',
            cookTestimonialId,
            userId: user.userId,
            cookId: user.userId,
            bookingRequestOfferId: null,
            authorName: 'Nia',
            displayAuthorName: 'Nia',
            location: 'Hamburg',
            displayLocation: 'Hamburg',
            occasion: 'Lunch',
            displayOccasion: 'Lunch',
            body: 'Standalone',
            imageUrls: [],
            rating: 5,
            lowRatingAnswers: { whatWentWrong: 'None' },
            publicationStatus: 'PUBLISHED',
            publicPagePlacements: [],
        });
    });

    it('fills offer fallbacks and city placement when the review is linked to an offer', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Nia', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: user.userId });
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
            cookId: user.userId,
            ...offerFees,
        });
        const cookTestimonialId = idCreate();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId,
            userId: user.userId,
            cookId: user.userId,
            bookingRequestOfferId,
            body: 'Linked',
            rating: 4,
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
            pathName: `cook-find-${token}`,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        await testDb.insert(cityTestimonials).values({
            cityId,
            testimonialType: 'COOK',
            testimonialId: cookTestimonialId,
            index: 2,
        });

        // Act
        const row = await adminCookTestimonialFindOne({ cookTestimonialId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            bookingRequestOfferId,
            authorName: null,
            displayAuthorName: 'Nia',
            displayLocation: 'Berlin',
            displayOccasion: 'Dinner',
            publicationStatus: 'PUBLISHED',
            publicPagePlacements: [
                {
                    kind: 'CITY',
                    entityId: cityId,
                    labelDe: 'Berlin',
                    labelEn: 'Berlin',
                    pathName: `cook-find-${token}`,
                    index: 2,
                },
            ],
        });
    });

    it('returns null for an unknown id and does not log', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const row = await adminCookTestimonialFindOne({ cookTestimonialId: idCreate() }, requestingSession, serverRuntime);

        // Assert
        expect(row).toBeNull();
        expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
    });
});
