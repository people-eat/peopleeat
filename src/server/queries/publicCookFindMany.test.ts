import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, customerTestimonials, fileUploads, meals, users } from '../db/schema';
import type { MealCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicCookFindMany } from './publicCookFindMany';
import { publicCookFindOne } from './publicCookFindOne';

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

const munich = {
    ...berlin,
    displayText: 'Munich',
    latitude: 48.137,
    longitude: 11.575,
    city: 'Munich',
    postCode: '80331',
};

async function insertMealImage(cookId: string) {
    const fileUploadId = idCreate();
    await testDb.insert(fileUploads).values({
        fileUploadId,
        userId: cookId,
        filename: 'meal.jpg',
        mediaType: 'image/jpeg',
        size: 3,
        bytes: Buffer.from([1, 2, 3]),
    });
    return fileUploadId;
}

async function insertMeal(cookId: string, overrides: Partial<MealCreate> = {}) {
    const mealId = overrides.mealId ?? idCreate();
    const imageFileUploadId = overrides.imageFileUploadId !== undefined ? overrides.imageFileUploadId : await insertMealImage(cookId);
    const [row] = await testDb
        .insert(meals)
        .values({
            mealId,
            cookId,
            title: overrides.title ?? `Meal ${mealId.slice(0, 8)}`,
            description: overrides.description ?? 'Description',
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
            ...overrides,
            imageFileUploadId,
        })
        .returning();
    if (!row) throw new Error('insertMeal: no row');
    return row;
}

async function insertPublicCook(
    overrides: {
        isVisible?: boolean;
        isApprovedByAdmin?: boolean;
        firstName?: string;
        withPublishedMeal?: boolean;
        maximumTravelDistance?: number | null;
        address?: typeof berlin | null;
        legacyCityName?: string | null;
        profilePictureFileUploadId?: string | null;
        cuisineStyle?: string | null;
        cookingPhilosophy?: string | null;
        status?: 'ACTIVE' | 'BANNED' | 'ANONYMIZED';
    } = {},
) {
    const setup = await commandSetup.withUser({ firstName: overrides.firstName ?? 'Public', lastName: 'Chef' });
    if (overrides.status && overrides.status !== 'ACTIVE') {
        await testDb.update(users).set({ status: overrides.status }).where(eq(users.userId, setup.user.userId));
    }
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: overrides.isVisible ?? true,
        isApprovedByAdmin: overrides.isApprovedByAdmin ?? true,
        biography: 'Full bio',
        biographySummary: 'Short summary',
        cuisineStyle: overrides.cuisineStyle ?? null,
        cookingPhilosophy: overrides.cookingPhilosophy ?? null,
        exactTravelOriginAddress: overrides.address === undefined ? berlin : overrides.address,
        legacyCityName: overrides.legacyCityName ?? null,
        maximumTravelDistance: overrides.maximumTravelDistance === undefined ? 50 : overrides.maximumTravelDistance,
    });
    if (overrides.profilePictureFileUploadId) {
        await testDb
            .update(users)
            .set({ profilePictureFileUploadId: overrides.profilePictureFileUploadId })
            .where(eq(users.userId, setup.user.userId));
    }
    if (overrides.withPublishedMeal !== false) {
        await insertMeal(setup.user.userId);
    }
    return setup;
}

async function insertPublishedCustomerReview(cookId: string) {
    const customer = await commandSetup.withUser({ firstName: 'Reviewer', lastName: 'Guest' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date('2024-06-01T18:00:00.000Z'),
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
        userAccepted: true,
        menuPriceCents: 20_000,
        travelExpensesCents: 2_500,
        paymentProviderFeeCents: 500,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 0,
        platformFeeCentsCook: 3_600,
        platformFeeCentsCustomer: 0,
        payoutCentsCook: 18_400,
        totalWithoutDiscountsCentsCustomer: 23_000,
        paymentStatus: 'PAYED',
    });
    await testDb.insert(customerTestimonials).values({
        customerTestimonialId: idCreate(),
        userId: customer.user.userId,
        bookingRequestOfferId,
        body: 'Great evening',
        rating: 5,
        publicationStatus: 'PUBLISHED',
        publishedAt: new Date('2024-06-02T12:00:00.000Z'),
    });
}

describe('publicCookFindMany', () => {
    it('includes visible approved cooks with a published meal that has an image and excludes others', async () => {
        // Arrange
        const visible = await insertPublicCook({ firstName: 'Visible' });
        const hidden = await insertPublicCook({ firstName: 'Hidden', isVisible: false });
        const unapproved = await insertPublicCook({ firstName: 'Pending', isApprovedByAdmin: false });
        const noMeal = await insertPublicCook({ firstName: 'NoMeal', withPublishedMeal: false });
        const publishedWithoutImage = await insertPublicCook({
            firstName: 'NoImage',
            withPublishedMeal: false,
        });
        await insertMeal(publishedWithoutImage.user.userId, { imageFileUploadId: null });
        const banned = await insertPublicCook({ firstName: 'Banned', status: 'BANNED' });
        const anonymized = await insertPublicCook({ firstName: 'Anon', status: 'ANONYMIZED' });

        // Act
        const rows = await publicCookFindMany({}, visible.serverRuntime);

        // Assert
        expect(rows.some((row) => row.cookId === visible.user.userId)).toBe(true);
        expect(rows.some((row) => row.cookId === hidden.user.userId)).toBe(false);
        expect(rows.some((row) => row.cookId === unapproved.user.userId)).toBe(false);
        expect(rows.some((row) => row.cookId === noMeal.user.userId)).toBe(false);
        expect(rows.some((row) => row.cookId === publishedWithoutImage.user.userId)).toBe(false);
        expect(rows.some((row) => row.cookId === banned.user.userId)).toBe(false);
        expect(rows.some((row) => row.cookId === anonymized.user.userId)).toBe(false);
        const listed = rows.find((row) => row.cookId === visible.user.userId);
        expect(listed).toMatchObject({
            biographySummary: 'Short summary',
            city: 'Berlin',
            user: { display: 'Visible' },
        });
    });

    it('filters by searchText across name, cuisine, and city', async () => {
        // Arrange
        const match = await insertPublicCook({ firstName: 'Searchable', cuisineStyle: 'Mediterran' });
        const other = await insertPublicCook({ firstName: 'Other', address: munich });
        const legacyOnly = await insertPublicCook({
            firstName: 'LegacyCity',
            address: null,
            legacyCityName: 'Hamburg',
        });

        // Act
        const byName = await publicCookFindMany({ criterion: { searchText: 'Searchable' } }, match.serverRuntime);
        const byCuisine = await publicCookFindMany({ criterion: { searchText: 'Mediterran' } }, match.serverRuntime);
        const byCity = await publicCookFindMany({ criterion: { searchText: 'Munich' } }, match.serverRuntime);
        const byLegacyCity = await publicCookFindMany({ criterion: { searchText: 'Hamburg' } }, match.serverRuntime);

        // Assert
        expect(byName.map((row) => row.cookId)).toContain(match.user.userId);
        expect(byName.map((row) => row.cookId)).not.toContain(other.user.userId);
        expect(byCuisine.map((row) => row.cookId)).toContain(match.user.userId);
        expect(byCity.map((row) => row.cookId)).toContain(other.user.userId);
        expect(byCity.map((row) => row.cookId)).not.toContain(match.user.userId);
        expect(byLegacyCity.map((row) => row.cookId)).toContain(legacyOnly.user.userId);
        expect(byLegacyCity.map((row) => row.cookId)).not.toContain(match.user.userId);
    });

    it('falls back public city to legacyCityName when exact travel origin city is missing', async () => {
        // Arrange
        const legacyOnly = await insertPublicCook({
            firstName: 'Legacy',
            address: null,
            legacyCityName: 'Köln',
        });
        const exactWins = await insertPublicCook({
            firstName: 'Exact',
            address: berlin,
            legacyCityName: 'Hamburg',
        });

        // Act
        const rows = await publicCookFindMany({}, legacyOnly.serverRuntime);
        const legacyRow = rows.find((row) => row.cookId === legacyOnly.user.userId);
        const exactRow = rows.find((row) => row.cookId === exactWins.user.userId);

        // Assert
        expect(legacyRow?.city).toBe('Köln');
        expect(exactRow?.city).toBe('Berlin');
    });

    it('filters by geoCoordinates within maximumTravelDistance', async () => {
        // Arrange
        const near = await insertPublicCook({
            firstName: 'Near',
            maximumTravelDistance: 20,
            address: berlin,
        });
        const far = await insertPublicCook({
            firstName: 'Far',
            maximumTravelDistance: 20,
            address: munich,
        });

        // Act — point near Berlin
        const rows = await publicCookFindMany({ criterion: { geoCoordinates: { latitude: 52.53, longitude: 13.41 } } }, near.serverRuntime);

        // Assert
        expect(rows.some((row) => row.cookId === near.user.userId)).toBe(true);
        expect(rows.some((row) => row.cookId === far.user.userId)).toBe(false);
    });

    it('orders by picture, then published review, then cuisine/philosophy, then first name', async () => {
        // Arrange — same picture+tags tier; review should win over firstName
        const withPictureTagsOnly = await insertPublicCook({
            firstName: 'AaaPictureTags',
            profilePictureFileUploadId: idCreate(),
            cuisineStyle: 'Italian',
        });
        const withPictureReviewTags = await insertPublicCook({
            firstName: 'ZzzPictureReview',
            profilePictureFileUploadId: idCreate(),
            cookingPhilosophy: 'Seasonal',
        });
        await insertPublishedCustomerReview(withPictureReviewTags.user.userId);

        // Picture + no tags should still beat no picture + tags
        const withPictureNoTags = await insertPublicCook({
            firstName: 'MmmPicture',
            profilePictureFileUploadId: idCreate(),
        });
        const withoutPictureWithTags = await insertPublicCook({
            firstName: 'AaaNoPicture',
            cuisineStyle: 'French',
        });

        // Within same picture/review/tag tier, cuisine/philosophy presence beats bare name
        const bare = await insertPublicCook({ firstName: 'AaaBare' });
        const philosophyOnly = await insertPublicCook({
            firstName: 'ZzzPhilosophy',
            cookingPhilosophy: 'Farm to table',
        });

        // Act
        const rows = await publicCookFindMany({}, withPictureTagsOnly.serverRuntime);
        const ids = rows.map((row) => row.cookId);
        const indexOf = (userId: string) => ids.indexOf(userId);

        // Assert
        expect(indexOf(withPictureReviewTags.user.userId)).toBeLessThan(indexOf(withPictureTagsOnly.user.userId));
        expect(indexOf(withPictureNoTags.user.userId)).toBeLessThan(indexOf(withoutPictureWithTags.user.userId));
        expect(indexOf(philosophyOnly.user.userId)).toBeLessThan(indexOf(bare.user.userId));
    });
});

describe('publicCookFindOne', () => {
    it('returns a visible approved cook by cookId', async () => {
        // Arrange
        const setup = await insertPublicCook({ firstName: 'Detail', withPublishedMeal: false });

        // Act
        const row = await publicCookFindOne({ cookId: setup.user.userId }, setup.serverRuntime);

        // Assert
        expect(row).toMatchObject({ cookId: setup.user.userId, city: 'Berlin', user: { display: 'Detail' } });
    });

    it('returns null for an invisible cook', async () => {
        // Arrange
        const setup = await insertPublicCook({ isVisible: false, withPublishedMeal: false });

        // Act / Assert
        await expect(publicCookFindOne({ cookId: setup.user.userId }, setup.serverRuntime)).resolves.toBeNull();
    });

    it('returns null for a banned cook', async () => {
        // Arrange
        const setup = await insertPublicCook({ status: 'BANNED', withPublishedMeal: false });

        // Act / Assert
        await expect(publicCookFindOne({ cookId: setup.user.userId }, setup.serverRuntime)).resolves.toBeNull();
    });

    it('returns null when the cookId does not match any cook', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(publicCookFindOne({ cookId: idCreate() }, serverRuntime)).resolves.toBeNull();
    });
});
