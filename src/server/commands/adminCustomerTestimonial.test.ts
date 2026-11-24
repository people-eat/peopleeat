import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { slackNotifyTestimonialUpserted } from '../slack/slackNotifyBooking';
import { adminMutationParent, commandSetup, findLogsForSession, partnerVenueInsert, testDb } from '../test/commandTestUtils';
import { adminCustomerTestimonialDelete } from './adminCustomerTestimonialDelete';
import { adminCustomerTestimonialImageUpdate } from './adminCustomerTestimonialImageUpdate';
import { adminCustomerTestimonialPublish } from './adminCustomerTestimonialPublish';
import { adminCustomerTestimonialUpsert } from './adminCustomerTestimonialUpsert';

vi.mock('../slack/slackNotifyBooking', () => ({
    slackNotifyTestimonialUpserted: vi.fn(async () => {}),
}));

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

async function insertOffer() {
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Offer' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId });
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
        cookId: cook.user.userId,
        ...offerFees,
    });
    return { bookingRequestId, bookingRequestOfferId, customer };
}

async function insertCustomerTestimonial(userId: string, imageUrls: string[] | null = ['/keep']) {
    const customerTestimonialId = idCreate();
    await testDb.insert(customerTestimonials).values({
        customerTestimonialId,
        userId,
        authorName: 'Keep',
        body: 'Keep body',
        imageUrls,
        rating: 5,
        publicationStatus: 'PENDING_REVIEW',
        publishedAt: null,
    });
    return customerTestimonialId;
}

describe('adminCustomerTestimonialUpsert', () => {
    beforeEach(() => {
        vi.mocked(slackNotifyTestimonialUpserted).mockClear();
    });

    it('inserts a published testimonial and publishes adminUpdates', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-create');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Guest' });

        // Act
        const result = await adminCustomerTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    userId: customer.user.userId,
                    authorName: '  ada guest  ',
                    location: '  berlin  ',
                    occasion: '  dinner party  ',
                    body: '  hello   world  ',
                    rating: 2,
                    imageFileUploadIds: null,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, result.referenceId!));
        expect(row).toMatchObject({
            userId: customer.user.userId,
            bookingRequestOfferId: null,
            authorName: 'Ada guest',
            location: 'Berlin',
            occasion: 'Dinner party',
            body: 'Hello world',
            imageUrls: [],
            rating: 2,
            publicationStatus: 'PUBLISHED',
        });
        expect(row!.publishedAt).toBeInstanceOf(Date);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(slackNotifyTestimonialUpserted).not.toHaveBeenCalled();
    });

    it('inserts a testimonial linked to an offer with owned images in order', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-images');
        const { bookingRequestId, bookingRequestOfferId, customer } = await insertOffer();
        const first = await insertImage(admin.user.userId);
        const second = await insertImage(admin.user.userId, 'image/png');

        // Act
        const result = await adminCustomerTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    userId: customer.user.userId,
                    bookingRequestOfferId,
                    body: 'Loved it',
                    rating: 5,
                    imageFileUploadIds: [first, second],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, result.referenceId!));
        expect(row).toMatchObject({
            bookingRequestOfferId,
            body: 'Loved it',
            imageUrls: [`/api/file-uploads/${first}`, `/api/file-uploads/${second}`],
            publicationStatus: 'PUBLISHED',
        });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(slackNotifyTestimonialUpserted).toHaveBeenCalledWith(admin.serverRuntime, {
            bookingRequestId,
            bookingRequestOfferId,
            audience: 'CUSTOMER',
            action: 'CREATED',
            viaAdmin: true,
            authorName: 'Guest Offer',
            rating: 5,
            body: 'Loved it',
            imageCount: 2,
        });
    });

    it('updates copy without changing images, publication, user, or the offer link', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-update');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Update' });
        const { bookingRequestId, bookingRequestOfferId } = await insertOffer();
        const customerTestimonialId = idCreate();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId,
            userId: customer.user.userId,
            bookingRequestOfferId,
            authorName: 'Old',
            body: 'Old body',
            imageUrls: ['/keep'],
            rating: 2,
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
        });

        // Act
        const result = await adminCustomerTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    customerTestimonialId,
                    userId: idCreate(),
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
        expect(result).toEqual({ success: true, referenceId: customerTestimonialId });
        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row).toMatchObject({
            userId: customer.user.userId,
            bookingRequestOfferId,
            authorName: 'New name',
            location: 'Hamburg',
            occasion: 'Lunch',
            body: 'Updated body',
            imageUrls: ['/keep'],
            rating: 5,
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
        });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(slackNotifyTestimonialUpserted).toHaveBeenCalledWith(admin.serverRuntime, {
            bookingRequestId,
            bookingRequestOfferId,
            audience: 'CUSTOMER',
            action: 'UPDATED',
            viaAdmin: true,
            authorName: 'New name',
            rating: 5,
            body: 'Updated body',
            imageCount: 1,
        });
    });

    it('leaves images unchanged when imageFileUploadIds is null', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-null-images');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Null' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId);

        // Act
        await adminCustomerTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    customerTestimonialId,
                    userId: customer.user.userId,
                    body: 'Still here',
                    rating: 5,
                    imageFileUploadIds: null,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row!.imageUrls).toEqual(['/keep']);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(slackNotifyTestimonialUpserted).not.toHaveBeenCalled();
    });

    it('replaces images when imageFileUploadIds is provided and clears them when empty', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-replace-images');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Images' });
        const replacedId = await insertCustomerTestimonial(customer.user.userId);
        const clearedId = await insertCustomerTestimonial(customer.user.userId);
        const fileUploadId = await insertImage(admin.user.userId);

        // Act
        await adminCustomerTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    customerTestimonialId: replacedId,
                    userId: customer.user.userId,
                    body: 'With photo',
                    rating: 5,
                    imageFileUploadIds: [fileUploadId],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );
        await adminCustomerTestimonialUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    customerTestimonialId: clearedId,
                    userId: customer.user.userId,
                    body: 'No photo',
                    rating: 4,
                    imageFileUploadIds: [],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [replaced, cleared] = await Promise.all([
            testDb.select().from(customerTestimonials).where(eq(customerTestimonials.customerTestimonialId, replacedId)),
            testDb.select().from(customerTestimonials).where(eq(customerTestimonials.customerTestimonialId, clearedId)),
        ]);
        expect(replaced[0]!.imageUrls).toEqual([`/api/file-uploads/${fileUploadId}`]);
        expect(cleared[0]!.imageUrls).toEqual([]);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(2);
    });

    it('throws when the body is empty and does not publish or log', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-empty-body');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Empty' });

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { userId: customer.user.userId, body: '', rating: 5 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/body must not be empty/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(customerTestimonials).where(eq(customerTestimonials.userId, customer.user.userId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(0);
    });

    it('throws when the body is whitespace, leaves the row unchanged, and does not log', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-blank-body');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Blank' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId);

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { customerTestimonialId, userId: customer.user.userId, body: '  \n  ', rating: 1 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/body must not be empty/);

        const [row, logRows] = await Promise.all([
            testDb.select().from(customerTestimonials).where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(row[0]!.body).toBe('Keep body');
        expect(row[0]!.rating).toBe(5);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(0);
    });

    it('throws when the user does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-missing-user');
        const userId = idCreate();

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { userId, body: 'Hello', rating: 5 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/user not found/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(customerTestimonials).where(eq(customerTestimonials.userId, userId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows[0]!.message).toMatch(/user not found/);
    });

    it('throws when the booking request offer does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-missing-offer');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Offer' });
        const bookingRequestOfferId = idCreate();

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { userId: customer.user.userId, bookingRequestOfferId, body: 'Hello', rating: 5 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/booking request offer not found/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(customerTestimonials).where(eq(customerTestimonials.userId, customer.user.userId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows[0]!.message).toMatch(/booking request offer not found/);
    });

    it('throws when the testimonial does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-missing-row');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Missing' });

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { customerTestimonialId: idCreate(), userId: customer.user.userId, body: 'Hello', rating: 5 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/testimonial not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/testimonial not found/);
    });

    it('throws when an image is not owned by the admin and leaves the row unchanged', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-foreign-image');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Foreign' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId);
        const foreign = await insertImage(customer.user.userId);

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        customerTestimonialId,
                        userId: customer.user.userId,
                        body: 'Hello',
                        rating: 5,
                        imageFileUploadIds: [foreign],
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/file upload not found/);

        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row!.imageUrls).toEqual(['/keep']);
        expect(row!.body).toBe('Keep body');
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/file upload not found/);
    });

    it('throws when an image media type is not allowed and does not insert', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-bad-media');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Media' });
        const fileUploadId = await insertImage(admin.user.userId, 'application/pdf');

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { userId: customer.user.userId, body: 'Hello', rating: 5, imageFileUploadIds: [fileUploadId] } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/file media type is not allowed/);

        const rows = await testDb.select().from(customerTestimonials).where(eq(customerTestimonials.userId, customer.user.userId));
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/file media type is not allowed/);
    });

    it('throws when rating is missing and does not publish or log', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-rating-missing');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Rating' });

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { userId: customer.user.userId, body: 'Hello' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/rating is required/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(customerTestimonials).where(eq(customerTestimonials.userId, customer.user.userId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(0);
    });

    it('throws when rating is 0 and does not publish or log', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-rating-zero');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Zero' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId);

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { customerTestimonialId, userId: customer.user.userId, body: 'Hello', rating: 0 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/rating must be an integer from 1 to 5/);

        const [row, logRows] = await Promise.all([
            testDb.select().from(customerTestimonials).where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId)),
            findLogsForSession(admin.requestingSession.sessionId),
        ]);
        expect(row[0]!.rating).toBe(5);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(0);
    });

    it('throws Unauthorized when the admin user does not exist and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(idCreate()),
                { input: { userId: idCreate(), body: 'Hello', rating: 5 } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws Unauthorized when legal acceptance is stale and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('customer-upsert-stale', true);
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Stale' });

        // Act + Assert
        await expect(
            adminCustomerTestimonialUpsert(
                adminMutationParent(admin.user.userId),
                { input: { userId: customer.user.userId, body: 'Hello', rating: 5 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        const rows = await testDb.select().from(customerTestimonials).where(eq(customerTestimonials.userId, customer.user.userId));
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(admin.requestingSession.sessionId)).toHaveLength(0);
    });
});

describe('adminCustomerTestimonialPublish', () => {
    it('publishes and stamps publishedAt', async () => {
        // Arrange
        const admin = await adminSetup('customer-publish');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Publish' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId);
        const before = Date.now();

        // Act
        const result = await adminCustomerTestimonialPublish(
            adminMutationParent(admin.user.userId),
            { customerTestimonialId, publicationStatus: 'PUBLISHED' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: customerTestimonialId });
        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row!.publicationStatus).toBe('PUBLISHED');
        expect(row!.publishedAt!.getTime()).toBeGreaterThanOrEqual(before);
        expect(row!.body).toBe('Keep body');
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('unpublishes and clears publishedAt', async () => {
        // Arrange
        const admin = await adminSetup('customer-unpublish');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Unpublish' });
        const customerTestimonialId = idCreate();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId,
            userId: customer.user.userId,
            body: 'Live',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });

        // Act
        await adminCustomerTestimonialPublish(
            adminMutationParent(admin.user.userId),
            { customerTestimonialId, publicationStatus: 'PENDING_REVIEW' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row).toMatchObject({ publicationStatus: 'PENDING_REVIEW', publishedAt: null, body: 'Live' });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('throws when the testimonial does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('customer-publish-missing');

        // Act + Assert
        await expect(
            adminCustomerTestimonialPublish(
                adminMutationParent(admin.user.userId),
                { customerTestimonialId: idCreate(), publicationStatus: 'PUBLISHED' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/testimonial not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/testimonial not found/);
    });

    it('throws Unauthorized when the admin user does not exist and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminCustomerTestimonialPublish(
                adminMutationParent(idCreate()),
                { customerTestimonialId: idCreate(), publicationStatus: 'PUBLISHED' },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws Unauthorized when legal acceptance is stale and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('customer-publish-stale', true);
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'StalePub' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId);

        // Act + Assert
        await expect(
            adminCustomerTestimonialPublish(
                adminMutationParent(admin.user.userId),
                { customerTestimonialId, publicationStatus: 'PUBLISHED' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row!.publicationStatus).toBe('PENDING_REVIEW');
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(admin.requestingSession.sessionId)).toHaveLength(0);
    });
});

describe('adminCustomerTestimonialDelete', () => {
    it('deletes the testimonial and its city, partner, and occasion placements', async () => {
        // Arrange
        const admin = await adminSetup('customer-delete');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Delete' });
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Keep' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId);
        const cookTestimonialId = idCreate();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId,
            userId: cook.user.userId,
            cookId: cook.user.userId,
            body: 'Keep cook',
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date(),
        });
        const token = idCreate().slice(0, 8);
        const cityId = idCreate();
        const partnerVenueId = idCreate();
        const occasionId = idCreate();
        const page = {
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        };
        await testDb.insert(cities).values({
            cityId,
            nameDe: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            pathName: `city-${token}`,
            ...page,
        });
        await partnerVenueInsert({ partnerVenueId, name: 'Partner', pathName: `partner-${token}`, ...page });
        await testDb.insert(occasions).values({ occasionId, name: 'Occasion', pathName: `occasion-${token}`, ...page });
        await testDb.insert(cityTestimonials).values([
            { cityId, testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId, index: 0 },
            { cityId, testimonialType: 'COOK', testimonialId: cookTestimonialId, index: 1 },
        ]);
        await testDb.insert(partnerVenueTestimonials).values({
            partnerVenueId,
            testimonialType: 'CUSTOMER',
            testimonialId: customerTestimonialId,
            index: 0,
        });
        await testDb.insert(occasionTestimonials).values({
            occasionId,
            testimonialType: 'CUSTOMER',
            testimonialId: customerTestimonialId,
            index: 0,
        });

        // Act
        const result = await adminCustomerTestimonialDelete(
            adminMutationParent(admin.user.userId),
            { customerTestimonialId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: customerTestimonialId });
        const [customerRows, cityRows, partnerRows, occasionRows] = await Promise.all([
            testDb.select().from(customerTestimonials).where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId)),
            testDb.select().from(cityTestimonials).where(eq(cityTestimonials.cityId, cityId)),
            testDb.select().from(partnerVenueTestimonials).where(eq(partnerVenueTestimonials.partnerVenueId, partnerVenueId)),
            testDb.select().from(occasionTestimonials).where(eq(occasionTestimonials.occasionId, occasionId)),
        ]);
        expect(customerRows).toHaveLength(0);
        expect(partnerRows).toHaveLength(0);
        expect(occasionRows).toHaveLength(0);
        expect(cityRows).toEqual([expect.objectContaining({ testimonialType: 'COOK', testimonialId: cookTestimonialId, index: 1 })]);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('throws when the testimonial does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('customer-delete-missing');

        // Act + Assert
        await expect(
            adminCustomerTestimonialDelete(
                adminMutationParent(admin.user.userId),
                { customerTestimonialId: idCreate() },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/testimonial not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/testimonial not found/);
    });

    it('throws Unauthorized when the admin user does not exist and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminCustomerTestimonialDelete(
                adminMutationParent(idCreate()),
                { customerTestimonialId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws Unauthorized when legal acceptance is stale and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('customer-delete-stale', true);
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'DelStale' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId);

        // Act + Assert
        await expect(
            adminCustomerTestimonialDelete(
                adminMutationParent(admin.user.userId),
                { customerTestimonialId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row).toBeDefined();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(admin.requestingSession.sessionId)).toHaveLength(0);
    });
});

describe('adminCustomerTestimonialImageUpdate', () => {
    it('stores public urls in the given order and publishes adminUpdates', async () => {
        // Arrange
        const admin = await adminSetup('customer-image-update');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Image' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId, ['/old']);
        const first = await insertImage(admin.user.userId, 'image/webp');
        const second = await insertImage(admin.user.userId, 'image/gif');

        // Act
        const result = await adminCustomerTestimonialImageUpdate(
            adminMutationParent(admin.user.userId),
            { customerTestimonialId, imageFileUploadIds: [first, second] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: customerTestimonialId });
        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row!.imageUrls).toEqual([`/api/file-uploads/${first}`, `/api/file-uploads/${second}`]);
        expect(row!.body).toBe('Keep body');
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('clears images when the list is empty', async () => {
        // Arrange
        const admin = await adminSetup('customer-image-clear');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Clear' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId, ['/old']);

        // Act
        await adminCustomerTestimonialImageUpdate(
            adminMutationParent(admin.user.userId),
            { customerTestimonialId, imageFileUploadIds: [] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row!.imageUrls).toEqual([]);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('throws when the testimonial does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('customer-image-missing');

        // Act + Assert
        await expect(
            adminCustomerTestimonialImageUpdate(
                adminMutationParent(admin.user.userId),
                { customerTestimonialId: idCreate(), imageFileUploadIds: [] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/testimonial not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/testimonial not found/);
    });

    it('throws when the file is not owned, logs the error, and leaves images unchanged', async () => {
        // Arrange
        const admin = await adminSetup('customer-image-foreign');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'ForeignImg' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId, ['/old']);
        const foreign = await insertImage(customer.user.userId);

        // Act + Assert
        await expect(
            adminCustomerTestimonialImageUpdate(
                adminMutationParent(admin.user.userId),
                { customerTestimonialId, imageFileUploadIds: [foreign] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/file upload not found/);

        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row!.imageUrls).toEqual(['/old']);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/file upload not found/);
    });

    it('throws when the media type is not allowed, logs the error, and leaves images unchanged', async () => {
        // Arrange
        const admin = await adminSetup('customer-image-media');
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'MediaImg' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId, ['/old']);
        const fileUploadId = await insertImage(admin.user.userId, 'text/plain');

        // Act + Assert
        await expect(
            adminCustomerTestimonialImageUpdate(
                adminMutationParent(admin.user.userId),
                { customerTestimonialId, imageFileUploadIds: [fileUploadId] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/file media type is not allowed/);

        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row!.imageUrls).toEqual(['/old']);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/file media type is not allowed/);
    });

    it('throws Unauthorized when the admin user does not exist and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminCustomerTestimonialImageUpdate(
                adminMutationParent(idCreate()),
                { customerTestimonialId: idCreate(), imageFileUploadIds: [] },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws Unauthorized when legal acceptance is stale and does not publish', async () => {
        // Arrange
        const admin = await adminSetup('customer-image-stale', true);
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'ImgStale' });
        const customerTestimonialId = await insertCustomerTestimonial(customer.user.userId, ['/old']);

        // Act + Assert
        await expect(
            adminCustomerTestimonialImageUpdate(
                adminMutationParent(admin.user.userId),
                { customerTestimonialId, imageFileUploadIds: [] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        const [row] = await testDb
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId));
        expect(row!.imageUrls).toEqual(['/old']);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(admin.requestingSession.sessionId)).toHaveLength(0);
    });
});
