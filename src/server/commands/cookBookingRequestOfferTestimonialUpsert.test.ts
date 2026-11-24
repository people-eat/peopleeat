import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { adminLegalPrivacyPolicies, bookingRequestOffers, bookingRequests, cooks, cookTestimonials, fileUploads } from '../db/schema';
import { slackNotifyTestimonialUpserted } from '../slack/slackNotifyBooking';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookBookingRequestOfferTestimonialUpsert } from './cookBookingRequestOfferTestimonialUpsert';

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
};

async function seedOffer(options?: {
    paymentStatus?: 'PAYED' | 'PAYED_OUT_OF_SYSTEM' | 'EMPTY';
    paymentData?: boolean;
    dateTime?: Date;
    canceledAt?: Date | null;
    staleCookAcceptance?: boolean;
}) {
    const cook = await commandSetup.withUser({
        firstName: 'Chef',
        lastName: 'Review',
        ...(options?.staleCookAcceptance ? { lastAcceptedPrivacyPolicy: null, lastAcceptedTerms: null } : {}),
    });
    await testDb.insert(cooks).values({ cookId: cook.user.userId });
    if (options?.staleCookAcceptance) {
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId: idCreate(),
            bodyDe: 'Privacy',
            changeSummaryDe: 'Published',
            publishedAt: new Date('2000-01-01T00:00:00.000Z'),
        });
    }
    const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Guest' });
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
                : { paymentIntentId: 'pi_cook_testimonial', clientSecret: 'secret', transferId: 'tr_cook_testimonial' },
    });
    return { cook, customer, bookingRequestId, bookingRequestOfferId };
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
    const [row] = await testDb.select().from(cookTestimonials).where(eq(cookTestimonials.bookingRequestOfferId, bookingRequestOfferId));
    return row;
}

describe('cookBookingRequestOfferTestimonialUpsert', () => {
    beforeEach(() => {
        vi.mocked(slackNotifyTestimonialUpserted).mockClear();
    });

    it('inserts a published review for a paid completed offer and publishes user and admin updates', async () => {
        // Arrange
        const { cook, bookingRequestId, bookingRequestOfferId } = await seedOffer();
        const fileUploadId = await insertImage(cook.user.userId);

        // Act
        const result = await cookBookingRequestOfferTestimonialUpsert(
            cookMutationParent(cook.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    body: '  great guests  ',
                    rating: 5,
                    imageFileUploadIds: [fileUploadId],
                    lowRatingAnswers: { whatWentWrong: 'ignored', wouldRecommend: true },
                },
            },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({
            cookTestimonialId: result.referenceId,
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            authorName: null,
            location: null,
            occasion: null,
            body: 'Great guests',
            imageUrls: [`/api/file-uploads/${fileUploadId}`],
            rating: 5,
            lowRatingAnswers: { whatWentWrong: 'ignored', wouldRecommend: true },
            publicationStatus: 'PUBLISHED',
        });
        expect(row!.publishedAt).toBeInstanceOf(Date);
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(slackNotifyTestimonialUpserted).toHaveBeenCalledWith(cook.serverRuntime, {
            bookingRequestId,
            bookingRequestOfferId,
            audience: 'COOK',
            action: 'CREATED',
            viaAdmin: false,
            authorName: 'Chef Review',
            rating: 5,
            body: 'Great guests',
            imageCount: 1,
        });
    });

    it('publishes a rating of 4 and still stores the required low-rating answers', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();

        // Act
        await cookBookingRequestOfferTestimonialUpsert(
            cookMutationParent(cook.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    body: null,
                    rating: 4,
                    lowRatingAnswers: { whatWentWrong: 'Timing', wouldRecommend: true },
                },
            },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({
            body: null,
            imageUrls: [],
            rating: 4,
            lowRatingAnswers: { whatWentWrong: 'Timing', wouldRecommend: true },
            publicationStatus: 'PUBLISHED',
        });
        expect(row!.publishedAt).toBeInstanceOf(Date);
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('stores a pending review with trimmed low-rating answers when the rating is below 5', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();

        // Act
        await cookBookingRequestOfferTestimonialUpsert(
            cookMutationParent(cook.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    body: '   ',
                    rating: 3,
                    lowRatingAnswers: { whatWentWrong: '  the soup  ', wouldRecommend: false, additionalFeedback: '   ' },
                },
            },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({
            body: null,
            rating: 3,
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
            lowRatingAnswers: { whatWentWrong: 'the soup', wouldRecommend: false },
        });
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('inserts a published review for a past offer paid outside the system', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer({ paymentStatus: 'PAYED_OUT_OF_SYSTEM', paymentData: false });

        // Act
        await cookBookingRequestOfferTestimonialUpsert(
            cookMutationParent(cook.user.userId),
            { input: { bookingRequestOfferId, rating: 5, body: 'Paid outside' } },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({ body: 'Paid outside', publicationStatus: 'PUBLISHED', rating: 5 });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('rejects a rating below 5 without answers, logs the error, and does not publish', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(cook.user.userId),
                { input: { bookingRequestOfferId, rating: 2, body: 'Rough' } },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/lowRatingAnswers required when rating < 5/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(cook.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(cook.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(cook.requestingSession.sessionId))[0]!.message).toMatch(/lowRatingAnswers required/);
    });

    it('rejects an offer whose event is still in the future', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer({ dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(cook.user.userId),
                { input: { bookingRequestOfferId, rating: 5, body: 'Too soon' } },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/offer is not completed yet/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(cook.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(cook.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(cook.requestingSession.sessionId))[0]!.message).toMatch(/offer is not completed yet/);
    });

    it('rejects a canceled offer', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer({ canceledAt: new Date() });

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(cook.user.userId),
                { input: { bookingRequestOfferId, rating: 5 } },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/offer is not completed yet/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(cook.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(cook.requestingSession.sessionId))[0]!.message).toMatch(/offer is not completed yet/);
    });

    it('rejects an offer that belongs to another cook', async () => {
        // Arrange
        const { bookingRequestOfferId } = await seedOffer();
        const other = await commandSetup.withUser({ firstName: 'Other', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: other.user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(other.user.userId),
                { input: { bookingRequestOfferId, rating: 5 } },
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
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Missing' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(cook.user.userId),
                { input: { bookingRequestOfferId: idCreate(), rating: 5 } },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/offer not found/);

        expect(cook.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(cook.requestingSession.sessionId))[0]!.message).toMatch(/offer not found/);
    });

    it('rejects an image the cook does not own and does not insert', async () => {
        // Arrange
        const { cook, customer, bookingRequestOfferId } = await seedOffer();
        const foreign = await insertImage(customer.user.userId);

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(cook.user.userId),
                { input: { bookingRequestOfferId, rating: 5, imageFileUploadIds: [foreign] } },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/file upload not found/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(cook.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(cook.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(cook.requestingSession.sessionId))[0]!.message).toMatch(/file upload not found/);
    });

    it('rejects a disallowed image media type and leaves an existing row unchanged', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();
        const cookTestimonialId = idCreate();
        const publishedAt = new Date('2024-02-02T00:00:00.000Z');
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId,
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            body: 'Keep',
            imageUrls: ['/keep'],
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt,
        });
        const fileUploadId = await insertImage(cook.user.userId, 'application/pdf');

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(cook.user.userId),
                { input: { bookingRequestOfferId, rating: 4, body: 'Changed', imageFileUploadIds: [fileUploadId] } },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/file media type is not allowed/);

        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({ body: 'Keep', imageUrls: ['/keep'], rating: 5 });
        expect(cook.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(cook.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(cook.requestingSession.sessionId))[0]!.message).toMatch(/file media type is not allowed/);
    });

    it('keeps publishedAt and stored answers when an edit stays published below 5 and clears omitted images', async () => {
        // Arrange
        const { cook, bookingRequestId, bookingRequestOfferId } = await seedOffer({
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        const publishedAt = new Date('2024-03-01T00:00:00.000Z');
        const cookTestimonialId = idCreate();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId,
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            body: 'Old',
            imageUrls: ['/keep'],
            rating: 5,
            lowRatingAnswers: { whatWentWrong: 'Cold' },
            publicationStatus: 'PUBLISHED',
            publishedAt,
        });

        // Act — status gate applies only on insert, so a future event can still be edited.
        const result = await cookBookingRequestOfferTestimonialUpsert(
            cookMutationParent(cook.user.userId),
            { input: { bookingRequestOfferId, rating: 4, body: '  still good  ' } },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cookTestimonialId });
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({
            body: 'Still good',
            rating: 4,
            imageUrls: [],
            lowRatingAnswers: { whatWentWrong: 'Cold' },
            publicationStatus: 'PUBLISHED',
        });
        expect(row!.publishedAt).toEqual(publishedAt);
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(slackNotifyTestimonialUpserted).toHaveBeenCalledWith(cook.serverRuntime, {
            bookingRequestId,
            bookingRequestOfferId,
            audience: 'COOK',
            action: 'UPDATED',
            viaAdmin: false,
            authorName: 'Chef Review',
            rating: 4,
            body: 'Still good',
            imageCount: 0,
        });
    });

    it('keeps existing low-rating answers when a later edit omits them', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();
        const cookTestimonialId = idCreate();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId,
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            body: 'Old',
            rating: 3,
            lowRatingAnswers: { whatWentWrong: 'Late', wouldRecommend: false },
            publicationStatus: 'PENDING_REVIEW',
        });

        // Act
        await cookBookingRequestOfferTestimonialUpsert(
            cookMutationParent(cook.user.userId),
            { input: { bookingRequestOfferId, rating: 2, body: 'Still late', imageFileUploadIds: null } },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({
            body: 'Still late',
            rating: 2,
            imageUrls: [],
            lowRatingAnswers: { whatWentWrong: 'Late', wouldRecommend: false },
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
        });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('replaces low-rating answers when a later edit sends them', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId: idCreate(),
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            rating: 3,
            lowRatingAnswers: { whatWentWrong: 'Late' },
            publicationStatus: 'PENDING_REVIEW',
        });

        // Act
        await cookBookingRequestOfferTestimonialUpsert(
            cookMutationParent(cook.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    rating: 1,
                    lowRatingAnswers: { whatWentWrong: '  no show  ', wouldRecommend: null, additionalFeedback: 'More time' },
                },
            },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row!.lowRatingAnswers).toEqual({ whatWentWrong: 'no show', additionalFeedback: 'More time' });
        expect(row!.rating).toBe(1);
        expect(row!.publicationStatus).toBe('PENDING_REVIEW');
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
    });

    it('rejects an edit below 5 when neither new nor stored answers exist', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId: idCreate(),
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            body: 'Five stars',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date('2024-04-01T00:00:00.000Z'),
        });

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(cook.user.userId),
                { input: { bookingRequestOfferId, rating: 3, body: 'Dropped' } },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/lowRatingAnswers required when rating < 5/);

        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({ rating: 5, body: 'Five stars', publicationStatus: 'PUBLISHED' });
        expect(cook.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(cook.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect((await findLogsForSession(cook.requestingSession.sessionId))[0]!.message).toMatch(/lowRatingAnswers required/);
    });

    it('stamps publishedAt when a pending review is raised to 5 and clears stored answers', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();
        const before = Date.now();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId: idCreate(),
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            rating: 2,
            lowRatingAnswers: { whatWentWrong: 'Late' },
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
        });

        // Act
        await cookBookingRequestOfferTestimonialUpsert(
            cookMutationParent(cook.user.userId),
            { input: { bookingRequestOfferId, rating: 5, body: 'Recovered' } },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({ rating: 5, body: 'Recovered', lowRatingAnswers: null, publicationStatus: 'PUBLISHED' });
        expect(row!.publishedAt!.getTime()).toBeGreaterThanOrEqual(before);
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('clears publishedAt when a published review drops below 5', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId: idCreate(),
            userId: cook.user.userId,
            cookId: cook.user.userId,
            bookingRequestOfferId,
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date('2024-05-01T00:00:00.000Z'),
        });

        // Act
        await cookBookingRequestOfferTestimonialUpsert(
            cookMutationParent(cook.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    rating: 3,
                    lowRatingAnswers: { whatWentWrong: 'Timing', wouldRecommend: true },
                },
            },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        const row = await rowFor(bookingRequestOfferId);
        expect(row).toMatchObject({
            rating: 3,
            publicationStatus: 'PENDING_REVIEW',
            publishedAt: null,
            lowRatingAnswers: { whatWentWrong: 'Timing', wouldRecommend: true },
        });
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('throws when rating is missing and does not publish or log', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(cook.user.userId),
                { input: { bookingRequestOfferId, body: 'Hi' } },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/rating is required/);

        const logRows = await findLogsForSession(cook.requestingSession.sessionId);
        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(cook.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(cook.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(0);
    });

    it('throws when rating is 0 and does not publish or log', async () => {
        // Arrange
        const { cook, bookingRequestOfferId } = await seedOffer();

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(cook.user.userId),
                { input: { bookingRequestOfferId, rating: 0 } },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/rating must be an integer from 1 to 5/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(cook.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(cook.requestingSession.sessionId)).toHaveLength(0);
    });

    it('throws Unauthorized when the cook user does not exist and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(idCreate()),
                { input: { bookingRequestOfferId: idCreate(), rating: 5 } },
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
        const { cook, bookingRequestOfferId } = await seedOffer({ staleCookAcceptance: true });

        // Act + Assert
        await expect(
            cookBookingRequestOfferTestimonialUpsert(
                cookMutationParent(cook.user.userId),
                { input: { bookingRequestOfferId, rating: 5 } },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(await rowFor(bookingRequestOfferId)).toBeUndefined();
        expect(cook.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(cook.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(await findLogsForSession(cook.requestingSession.sessionId)).toHaveLength(0);
    });
});
