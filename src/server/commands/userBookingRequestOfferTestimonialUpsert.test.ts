import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { adminLegalPrivacyPolicies, bookingRequestOffers, bookingRequests, cooks, customerTestimonials, fileUploads } from '../db/schema';
import { commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { userBookingRequestOfferTestimonialUpsert } from './userBookingRequestOfferTestimonialUpsert';

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
};

async function seedOffer(options?: {
    paymentStatus?: 'PAYED' | 'PAYED_OUT_OF_SYSTEM' | 'EMPTY';
    paymentData?: boolean;
    dateTime?: Date;
    canceledAt?: Date | null;
    staleCustomerAcceptance?: boolean;
}) {
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Review' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId });
    const customer = await commandSetup.withUser({
        firstName: 'Ada',
        lastName: 'Guest',
        ...(options?.staleCustomerAcceptance ? { lastAcceptedPrivacyPolicy: null, lastAcceptedTerms: null } : {}),
    });
    if (options?.staleCustomerAcceptance) {
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId: idCreate(),
            bodyDe: 'Privacy',
            changeSummaryDe: 'Published',
            publishedAt: new Date('2000-01-01T00:00:00.000Z'),
        });
    }
    const bookingRequestId = idCreate();
    const bookingRequestOfferId = idCreate();
    const paymentStatus = options?.paymentStatus ?? 'PAYED';
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: options?.dateTime ?? new Date(Date.now() - 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        canceledAt: options?.canceledAt ?? null,
    });
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: true,
        userAccepted: true,
        ...offerFees,
        paymentStatus,
        paymentData:
            options?.paymentData === false || paymentStatus === 'PAYED_OUT_OF_SYSTEM'
                ? null
                : { paymentIntentId: 'pi_user_testimonial', clientSecret: 'secret', transferId: 'tr_user_testimonial' },
    });
    return { cook, customer, bookingRequestOfferId };
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

async function rowFor(bookingRequestOfferId: string) {
    const [row] = await testDb
        .select()
        .from(customerTestimonials)
        .where(eq(customerTestimonials.bookingRequestOfferId, bookingRequestOfferId));
    return row;
}

describe('userBookingRequestOfferTestimonialUpsert', () => {
    it('inserts a published review for a paid completed offer and publishes user and admin updates', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();
        const first = await insertImage(customer.user.userId);
        const second = await insertImage(customer.user.userId, 'image/png');

        // Act
        const result = await userBookingRequestOfferTestimonialUpsert(
            userMutationParent(customer.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    body: '  lovely   evening  ',
                    rating: 5,
                    imageFileUploadIds: [first, second],
                },
            },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({
            customerTestimonialId: result.referenceId,
            userId: customer.user.userId,
            bookingRequestOfferId,
            authorName: null,
            location: null,
            occasion: null,
            body: 'Lovely evening',
            imageUrls: [`/api/file-uploads/${first}`, `/api/file-uploads/${second}`],
            rating: 5,
            publicationStatus: 'PUBLISHED',
        });
        expect(row!.publishedAt).toBeInstanceOf(Date);
        expect(customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('publishes a rating of 4 immediately', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();

        // Act
        await userBookingRequestOfferTestimonialUpsert(
            userMutationParent(customer.user.userId),
            { input: { bookingRequestOfferId, body: 'Good', rating: 4 } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({ rating: 4, body: 'Good', imageUrls: [], publicationStatus: 'PUBLISHED' });
        expect(row!.publishedAt).toBeInstanceOf(Date);
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('holds a rating of 3 for admin review', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();

        // Act
        await userBookingRequestOfferTestimonialUpsert(
            userMutationParent(customer.user.userId),
            { input: { bookingRequestOfferId, body: 'Mixed', rating: 3 } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({ rating: 3, body: 'Mixed', publicationStatus: 'PENDING_REVIEW', publishedAt: null });
        expect(customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('holds a rating of 1 for admin review', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();

        // Act
        await userBookingRequestOfferTestimonialUpsert(
            userMutationParent(customer.user.userId),
            { input: { bookingRequestOfferId, body: 'Not for us', rating: 1 } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(await rowFor(bookingRequestOfferId)).toMatchObject({ rating: 1, publicationStatus: 'PENDING_REVIEW', publishedAt: null });
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('inserts a published review for a past offer paid outside the system', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer({ paymentStatus: 'PAYED_OUT_OF_SYSTEM', paymentData: false });

        // Act
        await userBookingRequestOfferTestimonialUpsert(
            userMutationParent(customer.user.userId),
            { input: { bookingRequestOfferId, body: 'Paid outside', rating: 5 } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(await rowFor(bookingRequestOfferId)).toMatchObject({ body: 'Paid outside', publicationStatus: 'PUBLISHED' });
        expect(customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
    });

    it('rejects an empty body and does not publish or log', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(customer.user.userId),
                { input: { bookingRequestOfferId, body: '', rating: 5 } },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/body must not be empty/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(customer.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(customer.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(customer.requestingSession.sessionId)).toHaveLength(0);
    });

    it('rejects a whitespace body and leaves an existing row unchanged', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId: idCreate(),
            userId: customer.user.userId,
            bookingRequestOfferId,
            body: 'Keep',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(customer.user.userId),
                { input: { bookingRequestOfferId, body: '  \n  ', rating: 1 } },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/body must not be empty/);

        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({ body: 'Keep', rating: 5 });
        expect(customer.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(customer.requestingSession.sessionId)).toHaveLength(0);
    });

    it('rejects an offer whose event is still in the future', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer({ dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(customer.user.userId),
                { input: { bookingRequestOfferId, body: 'Too soon', rating: 5 } },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/offer is not completed yet/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(customer.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(customer.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(customer.requestingSession.sessionId))[0]!.message).toMatch(/offer is not completed yet/);
    });

    it('rejects a canceled offer', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer({ canceledAt: new Date() });

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(customer.user.userId),
                { input: { bookingRequestOfferId, body: 'Canceled', rating: 5 } },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/offer is not completed yet/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(customer.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(customer.requestingSession.sessionId))[0]!.message).toMatch(/offer is not completed yet/);
    });

    it('rejects an offer that belongs to another customer', async () => {
        // Arrange
        const { bookingRequestOfferId } = await seedOffer();
        const other = await commandSetup.withUser({ firstName: 'Other', lastName: 'Guest' });

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(other.user.userId),
                { input: { bookingRequestOfferId, body: 'Not mine', rating: 5 } },
                other.requestingSession,
                other.serverRuntime,
            ),
        ).rejects.toThrow(/offer not found/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(other.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(other.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(other.requestingSession.sessionId))[0]!.message).toMatch(/offer not found/);
    });

    it('rejects an unknown offer id', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Missing' });

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(customer.user.userId),
                { input: { bookingRequestOfferId: idCreate(), body: 'Hello', rating: 5 } },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/offer not found/);

        expect(customer.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(customer.requestingSession.sessionId))[0]!.message).toMatch(/offer not found/);
    });

    it('rejects an image the customer does not own and does not insert', async () => {
        // Arrange
        const { customer, cook, bookingRequestOfferId } = await seedOffer();
        const foreign = await insertImage(cook.user.userId);

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(customer.user.userId),
                { input: { bookingRequestOfferId, body: 'Photo', rating: 5, imageFileUploadIds: [foreign] } },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/file upload not found/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(customer.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(customer.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(customer.requestingSession.sessionId))[0]!.message).toMatch(/file upload not found/);
    });

    it('rejects a disallowed image media type and leaves an existing row unchanged', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId: idCreate(),
            userId: customer.user.userId,
            bookingRequestOfferId,
            body: 'Keep',
            imageUrls: ['/keep'],
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date('2024-02-02T00:00:00.000Z'),
        });
        const fileUploadId = await insertImage(customer.user.userId, 'application/pdf');

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(customer.user.userId),
                { input: { bookingRequestOfferId, body: 'Changed', rating: 4, imageFileUploadIds: [fileUploadId] } },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/file media type is not allowed/);

        expect(await rowFor(bookingRequestOfferId)).toMatchObject({ body: 'Keep', imageUrls: ['/keep'], rating: 5 });
        expect(customer.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(customer.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(customer.requestingSession.sessionId))[0]!.message).toMatch(/file media type is not allowed/);
    });

    it('keeps publishedAt when an already published review stays published and clears omitted images', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer({ dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
        const publishedAt = new Date('2024-03-01T00:00:00.000Z');
        const customerTestimonialId = idCreate();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId,
            userId: customer.user.userId,
            bookingRequestOfferId,
            body: 'Old',
            imageUrls: ['/keep'],
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt,
        });

        // Act — completion is required only on insert.
        const result = await userBookingRequestOfferTestimonialUpsert(
            userMutationParent(customer.user.userId),
            { input: { bookingRequestOfferId, body: '  still lovely  ', rating: 4 } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: customerTestimonialId });
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({ body: 'Still lovely', rating: 4, imageUrls: [], publicationStatus: 'PUBLISHED' });
        expect(row!.publishedAt).toEqual(publishedAt);
        expect(customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('stamps publishedAt when a pending review is raised to 5', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();
        const before = Date.now();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId: idCreate(),
            userId: customer.user.userId,
            bookingRequestOfferId,
            body: 'Mixed',
            rating: 2,
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
        });

        // Act
        await userBookingRequestOfferTestimonialUpsert(
            userMutationParent(customer.user.userId),
            { input: { bookingRequestOfferId, body: 'Recovered', rating: 5, imageFileUploadIds: [] } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({ body: 'Recovered', rating: 5, imageUrls: [], publicationStatus: 'PUBLISHED' });
        expect(row!.publishedAt!.getTime()).toBeGreaterThanOrEqual(before);
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('clears publishedAt when a published review drops to 3 or below', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId: idCreate(),
            userId: customer.user.userId,
            bookingRequestOfferId,
            body: 'Great',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date('2024-05-01T00:00:00.000Z'),
        });

        // Act
        await userBookingRequestOfferTestimonialUpsert(
            userMutationParent(customer.user.userId),
            { input: { bookingRequestOfferId, body: 'Changed my mind', rating: 2 } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({ body: 'Changed my mind', rating: 2, publicationStatus: 'PENDING_REVIEW', publishedAt: null });
        expect(customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('throws when rating is missing and does not publish or log', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(customer.user.userId),
                { input: { bookingRequestOfferId, body: 'Hello' } },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/rating is required/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(customer.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(customer.requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws when rating is 0 and does not publish or log', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId: idCreate(),
            userId: customer.user.userId,
            bookingRequestOfferId,
            body: 'Keep',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date(),
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(customer.user.userId),
                { input: { bookingRequestOfferId, body: 'Keep', rating: 0 } },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/rating must be an integer from 1 to 5/);

        expect((await rowFor(bookingRequestOfferId))!.rating).toBe(5);
        expect(customer.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(customer.requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws Unauthorized when the user does not exist and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(idCreate()),
                { input: { bookingRequestOfferId: idCreate(), body: 'Hello', rating: 5 } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws Unauthorized when legal acceptance is stale and does not publish', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer({ staleCustomerAcceptance: true });

        // Act + Assert
        await expect(
            userBookingRequestOfferTestimonialUpsert(
                userMutationParent(customer.user.userId),
                { input: { bookingRequestOfferId, body: 'Hello', rating: 5 } },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(customer.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(customer.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(customer.requestingSession.sessionId)).toHaveLength(0);
    });
});
