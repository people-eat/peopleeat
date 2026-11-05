import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, customerTestimonials, fileUploads, users } from '../db/schema';
import type { GqlSPublicCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicCookCustomerTestimonialRatingSummary } from './publicCookCustomerTestimonialRatingSummary';
import { publicCookCustomerTestimonialsFindMany } from './publicCookCustomerTestimonialsFindMany';

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

async function seedCook(firstName: string) {
    const cook = await commandSetup.withUser({ firstName, lastName: 'Chef' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId });
    return cook;
}

async function seedOffer(customerUserId: string, cookId: string, occasion = 'Dinner') {
    const bookingRequestId = idCreate();
    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customerUserId,
        occasion,
        dateTime: new Date('2024-06-01T18:00:00.000Z'),
        exactEventAddress: berlin,
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId,
        ...offerFees,
    });
    return bookingRequestOfferId;
}

describe('publicCookCustomerTestimonialsFindMany', () => {
    it('returns published reviews for the cook newest first, with fallbacks and the author picture', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const cook = await seedCook('Nia');
        const otherCook = await seedCook('Other');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Guest' });
        const pictureId = idCreate();
        await testDb.insert(fileUploads).values({
            fileUploadId: pictureId,
            userId: customer.user.userId,
            filename: 'ada.jpg',
            mediaType: 'image/jpeg',
            size: 3,
            bytes: Buffer.from([1, 2, 3]),
        });
        await testDb.update(users).set({ profilePictureFileUploadId: pictureId }).where(eq(users.userId, customer.user.userId));
        const olderOfferId = await seedOffer(customer.user.userId, cook.user.userId, 'Wedding');
        const newerOfferId = await seedOffer(customer.user.userId, cook.user.userId, 'Dinner');
        const hiddenOfferId = await seedOffer(customer.user.userId, cook.user.userId);
        const otherOfferId = await seedOffer(customer.user.userId, otherCook.user.userId);
        const olderId = idCreate();
        const newerId = idCreate();
        await testDb.insert(customerTestimonials).values([
            {
                customerTestimonialId: olderId,
                userId: customer.user.userId,
                bookingRequestOfferId: olderOfferId,
                authorName: 'Explicit Name',
                location: 'Hamburg',
                occasion: 'Named occasion',
                body: 'Older published',
                imageUrls: ['/photo'],
                rating: 5,
                publicationStatus: 'PUBLISHED',
                publishedAt: new Date('2024-01-02T00:00:00.000Z'),
                createdAt: new Date('2024-01-02T00:00:00.000Z'),
            },
            {
                customerTestimonialId: newerId,
                userId: customer.user.userId,
                bookingRequestOfferId: newerOfferId,
                body: 'Newer published',
                rating: 4,
                publicationStatus: 'PUBLISHED',
                publishedAt: new Date('2024-06-02T00:00:00.000Z'),
                createdAt: new Date('2024-06-02T00:00:00.000Z'),
            },
            {
                customerTestimonialId: idCreate(),
                userId: customer.user.userId,
                bookingRequestOfferId: hiddenOfferId,
                body: 'Pending',
                rating: 2,
                publicationStatus: 'PENDING_REVIEW',
                createdAt: new Date('2024-07-01T00:00:00.000Z'),
            },
            {
                customerTestimonialId: idCreate(),
                userId: customer.user.userId,
                bookingRequestOfferId: otherOfferId,
                body: 'Other cook',
                rating: 5,
                publicationStatus: 'PUBLISHED',
                publishedAt: new Date(),
                createdAt: new Date('2024-08-01T00:00:00.000Z'),
            },
            {
                customerTestimonialId: idCreate(),
                userId: customer.user.userId,
                body: 'No offer',
                rating: 5,
                publicationStatus: 'PUBLISHED',
                publishedAt: new Date(),
                createdAt: new Date('2024-09-01T00:00:00.000Z'),
            },
        ]);

        // Act
        const rows = await publicCookCustomerTestimonialsFindMany({ cookId: cook.user.userId } as GqlSPublicCook, serverRuntime);

        // Assert
        expect(rows.map((row) => row.customerTestimonialId)).toEqual([newerId, olderId]);
        const authorProfilePicture = {
            fileUploadId: pictureId,
            filename: 'ada.jpg',
            mediaType: 'image/jpeg',
            size: 3,
            url: `/api/file-uploads/${pictureId}`,
        };
        expect(rows[0]).toMatchObject({
            gqlTypeName: 'CustomerTestimonial',
            authorName: 'Ada',
            authorProfilePicture,
            location: 'Berlin',
            occasion: 'Dinner',
            body: 'Newer published',
            imageUrls: [],
            rating: 4,
        });
        expect(rows[1]).toMatchObject({
            gqlTypeName: 'CustomerTestimonial',
            authorName: 'Explicit Name',
            authorProfilePicture,
            location: 'Hamburg',
            occasion: 'Named occasion',
            body: 'Older published',
            imageUrls: ['/photo'],
            rating: 5,
        });
    });

    it('returns an empty list when the cook id matches nothing', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        const rows = await publicCookCustomerTestimonialsFindMany({ cookId: idCreate() } as GqlSPublicCook, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});

describe('publicCookCustomerTestimonialRatingSummary', () => {
    it('averages published ratings for the cook and ignores unpublished and other cooks', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const cook = await seedCook('Rated');
        const otherCook = await seedCook('Unrated');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Rated' });
        const five = await seedOffer(customer.user.userId, cook.user.userId);
        const four = await seedOffer(customer.user.userId, cook.user.userId);
        const pending = await seedOffer(customer.user.userId, cook.user.userId);
        const other = await seedOffer(customer.user.userId, otherCook.user.userId);
        await testDb.insert(customerTestimonials).values([
            {
                customerTestimonialId: idCreate(),
                userId: customer.user.userId,
                bookingRequestOfferId: five,
                body: 'Five',
                rating: 5,
                publicationStatus: 'PUBLISHED',
                publishedAt: new Date(),
            },
            {
                customerTestimonialId: idCreate(),
                userId: customer.user.userId,
                bookingRequestOfferId: four,
                body: 'Four',
                rating: 4,
                publicationStatus: 'PUBLISHED',
                publishedAt: new Date(),
            },
            {
                customerTestimonialId: idCreate(),
                userId: customer.user.userId,
                bookingRequestOfferId: pending,
                body: 'Pending',
                rating: 1,
                publicationStatus: 'PENDING_REVIEW',
            },
            {
                customerTestimonialId: idCreate(),
                userId: customer.user.userId,
                bookingRequestOfferId: other,
                body: 'Other',
                rating: 5,
                publicationStatus: 'PUBLISHED',
                publishedAt: new Date(),
            },
        ]);

        // Act
        const summary = await publicCookCustomerTestimonialRatingSummary(cook.user.userId, serverRuntime);

        // Assert
        expect(summary.reviewCount).toBe(2);
        expect(summary.averageRating).toBe(4.5);
    });

    it('returns a zero count and null average when the cook has no published reviews', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const cook = await seedCook('Quiet');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Quiet' });
        const offerId = await seedOffer(customer.user.userId, cook.user.userId);
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId: idCreate(),
            userId: customer.user.userId,
            bookingRequestOfferId: offerId,
            body: 'Pending only',
            rating: 2,
            publicationStatus: 'PENDING_REVIEW',
        });

        // Act
        const summary = await publicCookCustomerTestimonialRatingSummary(cook.user.userId, serverRuntime);
        const unknown = await publicCookCustomerTestimonialRatingSummary(idCreate(), serverRuntime);

        // Assert
        expect(summary).toEqual({ reviewCount: 0, averageRating: null });
        expect(unknown).toEqual({ reviewCount: 0, averageRating: null });
    });
});
