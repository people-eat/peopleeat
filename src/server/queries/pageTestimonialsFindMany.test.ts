import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    cities,
    cityTestimonials,
    cooks,
    cookTestimonials,
    customerTestimonials,
    occasions,
    occasionTestimonials,
    partnerVenueTestimonials,
} from '../db/schema';
import type {
    GqlSAdminCity,
    GqlSAdminOccasion,
    GqlSAdminPartnerVenue,
    GqlSPublicCity,
    GqlSPublicOccasion,
    GqlSPublicPartnerVenue,
} from '../graphql/generated';
import { commandSetup, partnerVenueInsert, testDb } from '../test/commandTestUtils';
import { adminCityTestimonialsFindMany } from './adminCityTestimonialsFindMany';
import { adminOccasionTestimonialsFindMany } from './adminOccasionTestimonialsFindMany';
import { adminPartnerVenueTestimonialsFindMany } from './adminPartnerVenueTestimonialsFindMany';
import { cityTestimonialsFindMany } from './cityTestimonialsFindMany';
import { occasionTestimonialsFindMany } from './occasionTestimonialsFindMany';
import { partnerVenueTestimonialsFindMany } from './partnerVenueTestimonialsFindMany';

async function seedCatalog() {
    const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Page' });
    const cook = await commandSetup.withUser({ firstName: 'Nia', lastName: 'Page' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId });
    const publishedCustomerId = idCreate();
    const pendingCustomerId = idCreate();
    const publishedCookId = idCreate();
    const danglingId = idCreate();
    await testDb.insert(customerTestimonials).values([
        {
            customerTestimonialId: publishedCustomerId,
            userId: customer.user.userId,
            authorName: 'Ada',
            body: 'Published customer',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date('2024-01-02T00:00:00.000Z'),
        },
        {
            customerTestimonialId: pendingCustomerId,
            userId: customer.user.userId,
            authorName: 'Ada',
            body: 'Pending customer',
            rating: 2,
            publicationStatus: 'PENDING_REVIEW',
        },
    ]);
    await testDb.insert(cookTestimonials).values({
        cookTestimonialId: publishedCookId,
        userId: cook.user.userId,
        cookId: cook.user.userId,
        authorName: 'Nia',
        body: 'Published cook',
        rating: 5,
        publicationStatus: 'PUBLISHED',
        publishedAt: new Date('2024-01-03T00:00:00.000Z'),
    });
    return { serverRuntime: customer.serverRuntime, publishedCustomerId, pendingCustomerId, publishedCookId, danglingId };
}

function pageCopy(token: string) {
    return {
        pathName: token,
        titleDe: 'Titel',
        descriptionDe: 'Beschreibung',
        headlineDe: 'Headline',
        subHeadlineDe: 'Sub',
        sections: [],
    };
}

function idOf(testimonial: { customerTestimonialId?: string; cookTestimonialId?: string }) {
    return 'customerTestimonialId' in testimonial ? testimonial.customerTestimonialId : testimonial.cookTestimonialId;
}

describe('adminCityTestimonialsFindMany', () => {
    it('returns curated rows in index order, including pending reviews and skipping missing catalog rows', async () => {
        // Arrange
        const { serverRuntime, publishedCustomerId, pendingCustomerId, publishedCookId, danglingId } = await seedCatalog();
        const cityId = idCreate();
        await testDb.insert(cities).values({
            cityId,
            nameDe: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            ...pageCopy(`admin-city-${cityId.slice(0, 8)}`),
        });
        await testDb.insert(cityTestimonials).values([
            { cityId, testimonialType: 'COOK', testimonialId: publishedCookId, index: 0 },
            { cityId, testimonialType: 'CUSTOMER', testimonialId: danglingId, index: 1 },
            { cityId, testimonialType: 'CUSTOMER', testimonialId: pendingCustomerId, index: 2 },
            { cityId, testimonialType: 'CUSTOMER', testimonialId: publishedCustomerId, index: 3 },
        ]);

        // Act
        const rows = await adminCityTestimonialsFindMany({ cityId } as GqlSAdminCity, serverRuntime);

        // Assert
        expect(rows.map((row) => ({ index: row.index, id: idOf(row.testimonial), listed: row.isPubliclyListed }))).toEqual([
            { index: 0, id: publishedCookId, listed: true },
            { index: 2, id: pendingCustomerId, listed: false },
            { index: 3, id: publishedCustomerId, listed: true },
        ]);
        expect(rows[0]!.testimonial).toMatchObject({ gqlTypeName: 'AdminCookTestimonial', body: 'Published cook' });
        expect(rows[2]!.testimonial).toMatchObject({ gqlTypeName: 'AdminCustomerTestimonial', body: 'Published customer' });
    });

    it('returns an empty list for an unknown city', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        const rows = await adminCityTestimonialsFindMany({ cityId: idCreate() } as GqlSAdminCity, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});

describe('cityTestimonialsFindMany', () => {
    it('returns published curated rows in index order and skips pending and missing rows', async () => {
        // Arrange
        const { serverRuntime, publishedCustomerId, pendingCustomerId, publishedCookId, danglingId } = await seedCatalog();
        const cityId = idCreate();
        await testDb.insert(cities).values({
            cityId,
            nameDe: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            ...pageCopy(`public-city-${cityId.slice(0, 8)}`),
        });
        await testDb.insert(cityTestimonials).values([
            { cityId, testimonialType: 'COOK', testimonialId: publishedCookId, index: 0 },
            { cityId, testimonialType: 'CUSTOMER', testimonialId: danglingId, index: 1 },
            { cityId, testimonialType: 'CUSTOMER', testimonialId: pendingCustomerId, index: 2 },
            { cityId, testimonialType: 'CUSTOMER', testimonialId: publishedCustomerId, index: 3 },
        ]);

        // Act
        const rows = await cityTestimonialsFindMany({ cityId } as GqlSPublicCity, serverRuntime);

        // Assert
        expect(rows.map((row) => ({ index: row.index, id: idOf(row.testimonial) }))).toEqual([
            { index: 0, id: publishedCookId },
            { index: 3, id: publishedCustomerId },
        ]);
        expect(rows[0]!.testimonial).toMatchObject({ gqlTypeName: 'CookTestimonial', authorName: 'Nia' });
        expect(rows[1]!.testimonial).toMatchObject({ gqlTypeName: 'CustomerTestimonial', authorName: 'Ada' });
    });

    it('returns an empty list for an unknown city', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        const rows = await cityTestimonialsFindMany({ cityId: idCreate() } as GqlSPublicCity, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});

describe('adminOccasionTestimonialsFindMany', () => {
    it('returns curated rows in index order, including pending reviews and skipping missing catalog rows', async () => {
        // Arrange
        const { serverRuntime, publishedCustomerId, pendingCustomerId, publishedCookId, danglingId } = await seedCatalog();
        const occasionId = idCreate();
        await testDb.insert(occasions).values({ occasionId, name: 'Dinner', ...pageCopy(`admin-occasion-${occasionId.slice(0, 8)}`) });
        await testDb.insert(occasionTestimonials).values([
            { occasionId, testimonialType: 'CUSTOMER', testimonialId: publishedCustomerId, index: 2 },
            { occasionId, testimonialType: 'COOK', testimonialId: danglingId, index: 0 },
            { occasionId, testimonialType: 'COOK', testimonialId: publishedCookId, index: 1 },
            { occasionId, testimonialType: 'CUSTOMER', testimonialId: pendingCustomerId, index: 3 },
        ]);

        // Act
        const rows = await adminOccasionTestimonialsFindMany({ occasionId } as GqlSAdminOccasion, serverRuntime);

        // Assert
        expect(rows.map((row) => ({ index: row.index, id: idOf(row.testimonial), listed: row.isPubliclyListed }))).toEqual([
            { index: 1, id: publishedCookId, listed: true },
            { index: 2, id: publishedCustomerId, listed: true },
            { index: 3, id: pendingCustomerId, listed: false },
        ]);
    });

    it('returns an empty list for an unknown occasion', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        const rows = await adminOccasionTestimonialsFindMany({ occasionId: idCreate() } as GqlSAdminOccasion, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});

describe('occasionTestimonialsFindMany', () => {
    it('returns published curated rows in index order and skips pending and missing rows', async () => {
        // Arrange
        const { serverRuntime, publishedCustomerId, pendingCustomerId, publishedCookId, danglingId } = await seedCatalog();
        const occasionId = idCreate();
        await testDb.insert(occasions).values({ occasionId, name: 'Dinner', ...pageCopy(`public-occasion-${occasionId.slice(0, 8)}`) });
        await testDb.insert(occasionTestimonials).values([
            { occasionId, testimonialType: 'CUSTOMER', testimonialId: pendingCustomerId, index: 0 },
            { occasionId, testimonialType: 'COOK', testimonialId: publishedCookId, index: 1 },
            { occasionId, testimonialType: 'CUSTOMER', testimonialId: danglingId, index: 2 },
            { occasionId, testimonialType: 'CUSTOMER', testimonialId: publishedCustomerId, index: 3 },
        ]);

        // Act
        const rows = await occasionTestimonialsFindMany({ occasionId } as GqlSPublicOccasion, serverRuntime);

        // Assert
        expect(rows.map((row) => ({ index: row.index, id: idOf(row.testimonial) }))).toEqual([
            { index: 1, id: publishedCookId },
            { index: 3, id: publishedCustomerId },
        ]);
    });

    it('returns an empty list for an unknown occasion', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        const rows = await occasionTestimonialsFindMany({ occasionId: idCreate() } as GqlSPublicOccasion, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});

describe('adminPartnerVenueTestimonialsFindMany', () => {
    it('returns curated rows in index order, including pending reviews and skipping missing catalog rows', async () => {
        // Arrange
        const { serverRuntime, publishedCustomerId, pendingCustomerId, publishedCookId, danglingId } = await seedCatalog();
        const venue = await partnerVenueInsert({ name: 'Haus', ...pageCopy(`admin-partner-${idCreate().slice(0, 8)}`) });
        await testDb.insert(partnerVenueTestimonials).values([
            { partnerVenueId: venue.partnerVenueId, testimonialType: 'CUSTOMER', testimonialId: pendingCustomerId, index: 1 },
            { partnerVenueId: venue.partnerVenueId, testimonialType: 'COOK', testimonialId: publishedCookId, index: 0 },
            { partnerVenueId: venue.partnerVenueId, testimonialType: 'CUSTOMER', testimonialId: danglingId, index: 2 },
            { partnerVenueId: venue.partnerVenueId, testimonialType: 'CUSTOMER', testimonialId: publishedCustomerId, index: 3 },
        ]);

        // Act
        const rows = await adminPartnerVenueTestimonialsFindMany(
            { partnerVenueId: venue.partnerVenueId } as GqlSAdminPartnerVenue,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => ({ index: row.index, id: idOf(row.testimonial), listed: row.isPubliclyListed }))).toEqual([
            { index: 0, id: publishedCookId, listed: true },
            { index: 1, id: pendingCustomerId, listed: false },
            { index: 3, id: publishedCustomerId, listed: true },
        ]);
    });

    it('returns an empty list for an unknown partner', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        const rows = await adminPartnerVenueTestimonialsFindMany({ partnerVenueId: idCreate() } as GqlSAdminPartnerVenue, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});

describe('partnerVenueTestimonialsFindMany', () => {
    it('returns published curated rows in index order and skips pending and missing rows', async () => {
        // Arrange
        const { serverRuntime, publishedCustomerId, pendingCustomerId, publishedCookId, danglingId } = await seedCatalog();
        const venue = await partnerVenueInsert({ name: 'Haus', ...pageCopy(`public-partner-${idCreate().slice(0, 8)}`) });
        await testDb.insert(partnerVenueTestimonials).values([
            { partnerVenueId: venue.partnerVenueId, testimonialType: 'CUSTOMER', testimonialId: publishedCustomerId, index: 4 },
            { partnerVenueId: venue.partnerVenueId, testimonialType: 'COOK', testimonialId: danglingId, index: 1 },
            { partnerVenueId: venue.partnerVenueId, testimonialType: 'CUSTOMER', testimonialId: pendingCustomerId, index: 2 },
            { partnerVenueId: venue.partnerVenueId, testimonialType: 'COOK', testimonialId: publishedCookId, index: 3 },
        ]);

        // Act
        const rows = await partnerVenueTestimonialsFindMany(
            { partnerVenueId: venue.partnerVenueId } as GqlSPublicPartnerVenue,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => ({ index: row.index, id: idOf(row.testimonial) }))).toEqual([
            { index: 3, id: publishedCookId },
            { index: 4, id: publishedCustomerId },
        ]);
    });

    it('returns an empty list for an unknown partner', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        const rows = await partnerVenueTestimonialsFindMany({ partnerVenueId: idCreate() } as GqlSPublicPartnerVenue, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});
