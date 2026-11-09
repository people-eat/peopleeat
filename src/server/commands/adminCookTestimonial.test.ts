import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    adminLegalPrivacyPolicies,
    admins,
    bookingRequestOffers,
    bookingRequests,
    cities,
    cityTestimonials,
    cooks,
    cookTestimonials,
    customerTestimonials,
    fileUploads,
    occasions,
    occasionTestimonials,
    partnerVenueTestimonials,
} from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, partnerVenueInsert, testDb } from '../test/commandTestUtils';
import { adminCookTestimonialDelete } from './adminCookTestimonialDelete';
import { adminCookTestimonialImageUpdate } from './adminCookTestimonialImageUpdate';
import { adminCookTestimonialPublish } from './adminCookTestimonialPublish';
import { adminCookTestimonialUpsert } from './adminCookTestimonialUpsert';

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
    travelExpensesCents: 2_500,
    paymentProviderFeeCents: 500,
    platformFeePercentCook: 18,
    platformFeePercentCustomer: 0,
    platformFeeCentsCook: 3_600,
    platformFeeCentsCustomer: 0,
    payoutCentsCook: 18_400,
    totalWithoutDiscountsCentsCustomer: 23_000,
    paymentStatus: 'EMPTY' as const,
};

async function adminSetup(firstName: string, staleAcceptance = false) {
    const admin = await commandSetup.withUser({
        firstName,
        lastName: 'Admin',
        ...(staleAcceptance ? { lastAcceptedPrivacyPolicy: null, lastAcceptedTerms: null } : {}),
    });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    if (staleAcceptance) {
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId: idCreate(),
            bodyDe: 'Privacy',
            changeSummaryDe: 'Published',
            publishedAt: new Date('2000-01-01T00:00:00.000Z'),
        });
    }
    return admin;
}

async function cookUser(firstName: string) {
    const cook = await commandSetup.withUser({ firstName, lastName: 'Cook' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId });
    return cook;
}

async function insertImage(userId: string, mediaType = 'image/jpeg') {
    const fileUploadId = idCreate();
    await testDb.insert(fileUploads).values({
        fileUploadId,
        userId,
        filename: 'photo.jpg',
        mediaType,
        size: 4,
        bytes: Buffer.from([1, 2, 3, 4]),
    });
    return fileUploadId;
}

async function insertOffer(cookId: string) {
    const customer = await commandSetup.withUser({ firstName: 'Guest', lastName: 'Offer' });
    const bookingRequestId = idCreate();
    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
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

async function insertCookTestimonial(cookId: string, imageUrls: string[] | null = ['/keep']) {
    const cookTestimonialId = idCreate();
    await testDb.insert(cookTestimonials).values({
        cookTestimonialId,
        userId: cookId,
        cookId,
        authorName: 'Keep',
        body: 'Keep body',
        imageUrls,
        rating: 5,
        publicationStatus: 'PENDING_REVIEW',
        publishedAt: null,
    });
    return cookTestimonialId;
}

describe('adminCookTestimonialUpsert', () => {
    it('inserts a published testimonial for an existing cook and publishes adminUpdates', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-create');
        const cook = await cookUser('Create');

        // Act
        const result = await adminCookTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    cookId: cook.user.userId,
                    authorName: '  ada cook  ',
                    location: '  berlin  ',
                    occasion: '  dinner party  ',
                    body: '  hello   world  ',
                    rating: 1,
                    imageFileUploadIds: null,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, result.referenceId!));
        expect(row).toMatchObject({
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId: null,
            authorName: 'Ada cook',
            location: 'Berlin',
            occasion: 'Dinner party',
            body: 'Hello world',
            imageUrls: [],
            rating: 1,
            lowRatingAnswers: null,
            publicationStatus: 'PUBLISHED',
        });
        expect(row!.publishedAt).toBeInstanceOf(Date);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('inserts a testimonial linked to an offer with owned images in order', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-images');
        const cook = await cookUser('Images');
        const bookingRequestOfferId = await insertOffer(cook.user.userId);
        const first = await insertImage(admin.user.userId);
        const second = await insertImage(admin.user.userId, 'image/png');

        // Act
        const result = await adminCookTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    cookId: cook.user.userId,
                    bookingRequestOfferId,
                    body: null,
                    rating: 5,
                    imageFileUploadIds: [first, second],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, result.referenceId!));
        expect(row).toMatchObject({
            bookingRequestOfferId,
            authorName: null,
            location: null,
            occasion: null,
            body: null,
            imageUrls: [`/api/file-uploads/${first}`, `/api/file-uploads/${second}`],
            rating: 5,
            publicationStatus: 'PUBLISHED',
        });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('stores a null body when prose is blank', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-blank-body');
        const cook = await cookUser('Blank');

        // Act
        const result = await adminCookTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    cookId: cook.user.userId,
                    authorName: '   ',
                    location: '',
                    occasion: null,
                    body: '   \n  ',
                    rating: 4,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, result.referenceId!));
        expect(row).toMatchObject({ authorName: null, location: null, occasion: null, body: null, rating: 4 });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('updates copy without changing images, publication, or the offer link', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-update');
        const cook = await cookUser('Update');
        const bookingRequestOfferId = await insertOffer(cook.user.userId);
        const cookTestimonialId = idCreate();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId,
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            authorName: 'Old',
            body: 'Old body',
            imageUrls: ['/keep'],
            rating: 2,
            lowRatingAnswers: { whatWentWrong: 'Cold' },
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
        });

        // Act
        const result = await adminCookTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    cookTestimonialId,
                    cookId: idCreate(),
                    bookingRequestOfferId: idCreate(),
                    authorName: '  new name  ',
                    location: 'hamburg',
                    occasion: 'lunch',
                    body: '  updated body  ',
                    rating: 5,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cookTestimonialId });
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row).toMatchObject({
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            authorName: 'New name',
            location: 'Hamburg',
            occasion: 'Lunch',
            body: 'Updated body',
            imageUrls: ['/keep'],
            rating: 5,
            lowRatingAnswers: { whatWentWrong: 'Cold' },
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
        });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('leaves images unchanged when imageFileUploadIds is null', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-null-images');
        const cook = await cookUser('NullImages');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId, ['/keep']);

        // Act
        await adminCookTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    cookTestimonialId,
                    cookId: cook.user.userId,
                    body: 'Still here',
                    rating: 5,
                    imageFileUploadIds: null,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row!.imageUrls).toEqual(['/keep']);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('replaces images when imageFileUploadIds is provided', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-replace-images');
        const cook = await cookUser('ReplaceImages');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId, ['/keep']);
        const fileUploadId = await insertImage(admin.user.userId);

        // Act
        await adminCookTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    cookTestimonialId,
                    cookId: cook.user.userId,
                    rating: 5,
                    imageFileUploadIds: [fileUploadId],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row!.imageUrls).toEqual([`/api/file-uploads/${fileUploadId}`]);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('clears images when imageFileUploadIds is empty', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-clear-images');
        const cook = await cookUser('ClearImages');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId, ['/keep']);

        // Act
        await adminCookTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    cookTestimonialId,
                    cookId: cook.user.userId,
                    rating: 5,
                    imageFileUploadIds: [],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row!.imageUrls).toEqual([]);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('throws when the cook does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-missing-cook');
        const user = await commandSetup.withUser({ firstName: 'Not', lastName: 'Cook' });

        // Act + Assert
        await expect(
            adminCookTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { cookId: user.user.userId, rating: 5, body: 'Hi' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/cook not found/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookId, user.user.userId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/cook not found/);
    });

    it('throws when the booking request offer does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-missing-offer');
        const cook = await cookUser('MissingOffer');
        const bookingRequestOfferId = idCreate();

        // Act + Assert
        await expect(
            adminCookTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { cookId: cook.user.userId, bookingRequestOfferId, rating: 5 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/booking request offer not found/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookId, cook.user.userId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows[0]!.message).toMatch(/booking request offer not found/);
    });

    it('throws when the testimonial does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-missing-row');
        const cook = await cookUser('MissingRow');
        const cookTestimonialId = idCreate();

        // Act + Assert
        await expect(
            adminCookTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { cookTestimonialId, cookId: cook.user.userId, rating: 5, body: 'Nope' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/testimonial not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows[0]!.message).toMatch(/testimonial not found/);
    });

    it('throws when an image is not owned by the admin, logs the error, and leaves the row unchanged', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-foreign-image');
        const cook = await cookUser('ForeignImage');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId, ['/keep']);
        const foreign = await insertImage(cook.user.userId);

        // Act + Assert
        await expect(
            adminCookTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        cookTestimonialId,
                        cookId: cook.user.userId,
                        rating: 5,
                        imageFileUploadIds: [foreign],
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/file upload not found/);

        const [row, logRows] = await Promise.all([
            testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(row[0]!.imageUrls).toEqual(['/keep']);
        expect(row[0]!.body).toBe('Keep body');
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows[0]!.message).toMatch(/file upload not found/);
    });

    it('throws when an image media type is not allowed and does not insert', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-bad-media');
        const cook = await cookUser('BadMedia');
        const fileUploadId = await insertImage(admin.user.userId, 'application/pdf');

        // Act + Assert
        await expect(
            adminCookTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { cookId: cook.user.userId, rating: 5, imageFileUploadIds: [fileUploadId] } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/file media type is not allowed/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookId, cook.user.userId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows[0]!.message).toMatch(/file media type is not allowed/);
    });

    it('throws when rating is missing and does not publish or log', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-rating-missing');
        const cook = await cookUser('RatingMissing');

        // Act + Assert
        await expect(
            adminCookTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { cookId: cook.user.userId, body: 'Hi' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/rating is required/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookId, cook.user.userId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(0);
    });

    it('throws when rating is 0 and does not publish or log', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-rating-zero');
        const cook = await cookUser('RatingZero');

        // Act + Assert
        await expect(
            adminCookTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { cookId: cook.user.userId, rating: 0 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/rating must be an integer from 1 to 5/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookId, cook.user.userId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(0);
    });

    it('throws Unauthorized when the admin user does not exist and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const adminId = idCreate();

        // Act + Assert
        await expect(
            adminCookTestimonialUpsert(
                adminMutationParent(adminId),
                { input: { cookId: idCreate(), rating: 5 } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(0);
    });

    it('throws Unauthorized when legal acceptance is stale and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('cook-upsert-stale', true);
        const cook = await cookUser('Stale');

        // Act + Assert
        await expect(
            adminCookTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { cookId: cook.user.userId, rating: 5 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookId, cook.user.userId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(0);
    });
});

describe('adminCookTestimonialPublish', () => {
    it('publishes and stamps publishedAt', async () => {
        // Arrange
        const admin = await adminSetup('cook-publish');
        const cook = await cookUser('Publish');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId);
        const before = Date.now();

        // Act
        const result = await adminCookTestimonialPublish(
            adminMutationParent(admin.user.userId),
            { cookTestimonialId, publicationStatus: 'PUBLISHED' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cookTestimonialId });
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row!.publicationStatus).toBe('PUBLISHED');
        expect(row!.publishedAt).toBeInstanceOf(Date);
        expect(row!.publishedAt!.getTime()).toBeGreaterThanOrEqual(before);
        expect(row!.body).toBe('Keep body');
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('unpublishes and clears publishedAt', async () => {
        // Arrange
        const admin = await adminSetup('cook-unpublish');
        const cook = await cookUser('Unpublish');
        const cookTestimonialId = idCreate();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId,
            userId: cook.user.userId,
            cookId: cook.user.userId,
            body: 'Live',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });

        // Act
        await adminCookTestimonialPublish(
            adminMutationParent(admin.user.userId),
            { cookTestimonialId, publicationStatus: 'PENDING_REVIEW' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row).toMatchObject({ publicationStatus: 'PENDING_REVIEW', publishedAt: null, body: 'Live' });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('throws when the testimonial does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('cook-publish-missing');
        const cookTestimonialId = idCreate();

        // Act + Assert
        await expect(
            adminCookTestimonialPublish(
                adminMutationParent(admin.user.userId),
                { cookTestimonialId, publicationStatus: 'PUBLISHED' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/testimonial not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows[0]!.message).toMatch(/testimonial not found/);
    });

    it('throws Unauthorized when the admin user does not exist and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminCookTestimonialPublish(
                adminMutationParent(idCreate()),
                { cookTestimonialId: idCreate(), publicationStatus: 'PUBLISHED' },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws Unauthorized when legal acceptance is stale and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('cook-publish-stale', true);
        const cook = await cookUser('PublishStale');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId);

        // Act + Assert
        await expect(
            adminCookTestimonialPublish(
                adminMutationParent(admin.user.userId),
                { cookTestimonialId, publicationStatus: 'PUBLISHED' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row!.publicationStatus).toBe('PENDING_REVIEW');
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(admin.requestingSession.sessionId)).toHaveLength(0);
    });
});

describe('adminCookTestimonialDelete', () => {
    it('deletes the testimonial and its city, partner, and occasion placements', async () => {
        // Arrange
        const admin = await adminSetup('cook-delete');
        const cook = await cookUser('Delete');
        const customer = await commandSetup.withUser({ firstName: 'Keep', lastName: 'Customer' });
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId);
        const customerTestimonialId = idCreate();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId,
            userId: customer.user.userId,
            body: 'Keep customer',
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date(),
        });
        const token = idCreate().slice(0, 8);
        const cityId = idCreate();
        const partnerVenueId = idCreate();
        const occasionId = idCreate();
        const page = {
            pathName: `cook-delete-${token}`,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        };
        await testDb
            .insert(cities)
            .values({ cityId, nameDe: 'Berlin', latitude: 52.52, longitude: 13.405, ...page, pathName: `city-${token}` });
        await partnerVenueInsert({ partnerVenueId, name: 'Partner', ...page, pathName: `partner-${token}` });
        await testDb.insert(occasions).values({ occasionId, name: 'Occasion', ...page, pathName: `occasion-${token}` });
        await testDb.insert(cityTestimonials).values([
            { cityId, testimonialType: 'COOK', testimonialId: cookTestimonialId, index: 0 },
            { cityId, testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId, index: 1 },
        ]);
        await testDb.insert(partnerVenueTestimonials).values({
            partnerVenueId,
            testimonialType: 'COOK',
            testimonialId: cookTestimonialId,
            index: 0,
        });
        await testDb.insert(occasionTestimonials).values({
            occasionId,
            testimonialType: 'COOK',
            testimonialId: cookTestimonialId,
            index: 0,
        });

        // Act
        const result = await adminCookTestimonialDelete(
            adminMutationParent(admin.user.userId),
            { cookTestimonialId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cookTestimonialId });
        const [cookRows, cityRows, partnerRows, occasionRows] = await Promise.all([
            testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId)),
            testDb.select().from(cityTestimonials).where(eq(cityTestimonials.cityId, cityId)),
            testDb.select().from(partnerVenueTestimonials).where(eq(partnerVenueTestimonials.partnerVenueId, partnerVenueId)),
            testDb.select().from(occasionTestimonials).where(eq(occasionTestimonials.occasionId, occasionId)),
        ]);
        expect(cookRows).toHaveLength(0);
        expect(partnerRows).toHaveLength(0);
        expect(occasionRows).toHaveLength(0);
        expect(cityRows).toEqual([
            expect.objectContaining({ testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId, index: 1 }),
        ]);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('throws when the testimonial does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('cook-delete-missing');

        // Act + Assert
        await expect(
            adminCookTestimonialDelete(
                adminMutationParent(admin.user.userId),
                { cookTestimonialId: idCreate() },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/testimonial not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows[0]!.message).toMatch(/testimonial not found/);
    });

    it('throws Unauthorized when the admin user does not exist and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminCookTestimonialDelete(
                adminMutationParent(idCreate()),
                { cookTestimonialId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws Unauthorized when legal acceptance is stale and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('cook-delete-stale', true);
        const cook = await cookUser('DeleteStale');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId);

        // Act + Assert
        await expect(
            adminCookTestimonialDelete(
                adminMutationParent(admin.user.userId),
                { cookTestimonialId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row).toBeDefined();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(admin.requestingSession.sessionId)).toHaveLength(0);
    });
});

describe('adminCookTestimonialImageUpdate', () => {
    it('stores public urls in the given order and publishes adminUpdates', async () => {
        // Arrange
        const admin = await adminSetup('cook-image-update');
        const cook = await cookUser('ImageUpdate');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId, ['/old']);
        const first = await insertImage(admin.user.userId, 'image/webp');
        const second = await insertImage(admin.user.userId, 'image/gif');

        // Act
        const result = await adminCookTestimonialImageUpdate(
            adminMutationParent(admin.user.userId),
            { cookTestimonialId, imageFileUploadIds: [first, second] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cookTestimonialId });
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row!.imageUrls).toEqual([`/api/file-uploads/${first}`, `/api/file-uploads/${second}`]);
        expect(row!.body).toBe('Keep body');
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('clears images when the list is empty', async () => {
        // Arrange
        const admin = await adminSetup('cook-image-clear');
        const cook = await cookUser('ImageClear');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId, ['/old']);

        // Act
        await adminCookTestimonialImageUpdate(
            adminMutationParent(admin.user.userId),
            { cookTestimonialId, imageFileUploadIds: [] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row!.imageUrls).toEqual([]);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('throws when the testimonial does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('cook-image-missing');

        // Act + Assert
        await expect(
            adminCookTestimonialImageUpdate(
                adminMutationParent(admin.user.userId),
                { cookTestimonialId: idCreate(), imageFileUploadIds: [] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/testimonial not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows[0]!.message).toMatch(/testimonial not found/);
    });

    it('throws when the file is not owned, logs the error, and leaves images unchanged', async () => {
        // Arrange
        const admin = await adminSetup('cook-image-foreign');
        const cook = await cookUser('ImageForeign');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId, ['/old']);
        const foreign = await insertImage(cook.user.userId);

        // Act + Assert
        await expect(
            adminCookTestimonialImageUpdate(
                adminMutationParent(admin.user.userId),
                { cookTestimonialId, imageFileUploadIds: [foreign] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/file upload not found/);

        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row!.imageUrls).toEqual(['/old']);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/file upload not found/);
    });

    it('throws when the media type is not allowed, logs the error, and leaves images unchanged', async () => {
        // Arrange
        const admin = await adminSetup('cook-image-media');
        const cook = await cookUser('ImageMedia');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId, ['/old']);
        const fileUploadId = await insertImage(admin.user.userId, 'text/plain');

        // Act + Assert
        await expect(
            adminCookTestimonialImageUpdate(
                adminMutationParent(admin.user.userId),
                { cookTestimonialId, imageFileUploadIds: [fileUploadId] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/file media type is not allowed/);

        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row!.imageUrls).toEqual(['/old']);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/file media type is not allowed/);
    });

    it('throws Unauthorized when the admin user does not exist and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminCookTestimonialImageUpdate(
                adminMutationParent(idCreate()),
                { cookTestimonialId: idCreate(), imageFileUploadIds: [] },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws Unauthorized when legal acceptance is stale and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('cook-image-stale', true);
        const cook = await cookUser('ImageStale');
        const cookTestimonialId = await insertCookTestimonial(cook.user.userId, ['/old']);

        // Act + Assert
        await expect(
            adminCookTestimonialImageUpdate(
                adminMutationParent(admin.user.userId),
                { cookTestimonialId, imageFileUploadIds: [] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId));
        expect(row!.imageUrls).toEqual(['/old']);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(admin.requestingSession.sessionId)).toHaveLength(0);
    });
});
