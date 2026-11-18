import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { fileUploadPublicUrl } from '../../shared/contentSection';
import { idCreate } from '../../shared/idCreate';
import { fileUploadCreate } from '../commands/fileUploadCreate';
import {
    authOauthTickets,
    bookingRequestOffers,
    bookingRequests,
    cooks,
    customerTestimonials,
    giftCards,
    meals,
    menuCourseMealOptions,
    menuCourses,
    menus,
    outboundEmailAttachments,
    outboundEmails,
} from '../db/schema';
import type { BookingRequestOfferConfiguredMenu } from '../domain/bookingRequest';
import { commandSetup, testDb } from '../test/commandTestUtils';
import {
    fileUploadAccessibleViaBookingRequestOfferMeal,
    fileUploadReferencedByAnyTestimonial,
    fileUploadReferencedByGiftCardPdf,
    fileUploadReferencedByOutboundEmailAttachment,
    fileUploadReferencedByPublishedMeal,
    fileUploadReferencedByPublishedTestimonial,
    fileUploadReferencedBySessionOauthTicket,
} from './fileUploadContentAccess';

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

describe('fileUploadReferencedBySessionOauthTicket', () => {
    it('allows the owning session to read a pending OAuth photo', async () => {
        const owner = await commandSetup();
        const stranger = await commandSetup();
        const upload = await fileUploadCreate(testDb, {
            userId: null,
            filename: 'avatar.webp',
            mediaType: 'image/webp',
            bytes: Buffer.from('RIFF'),
        });
        await testDb.insert(authOauthTickets).values({
            authOauthTicketId: idCreate(),
            sessionId: owner.requestingSession.sessionId,
            provider: 'GOOGLE',
            subject: `sub-${idCreate()}`,
            emailAddress: `oauth-picture-${idCreate().toLowerCase()}@example.com`,
            firstName: 'Ada',
            lastName: 'Lovelace',
            profilePictureFileUploadId: upload.fileUploadId,
            verifiedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });

        expect(await fileUploadReferencedBySessionOauthTicket(testDb, upload.fileUploadId, owner.requestingSession.sessionId)).toBe(true);
        expect(await fileUploadReferencedBySessionOauthTicket(testDb, upload.fileUploadId, stranger.requestingSession.sessionId)).toBe(
            false,
        );
    });
});

describe('fileUploadContentAccess invoice helpers', () => {
    it('detects a gift-card invoice file upload', async () => {
        const { requestingSession } = await commandSetup();
        const upload = await fileUploadCreate(testDb, {
            userId: null,
            filename: 'receipt.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF'),
        });

        await testDb.insert(giftCards).values({
            giftCardId: idCreate(),
            sessionId: requestingSession.sessionId,
            buyerEmail: 'buyer@example.com',
            locale: 'en',
            occasion: 'Birthday',
            recipientName: 'Ada Lovelace',
            message: '',
            originalBalanceCents: 5000,
            balanceCents: 5000,
            redeemCode: `TEST-${idCreate().slice(0, 8)}`,
            paymentIntentId: 'pi_test',
            paymentClientSecret: 'pi_test_secret',
            paymentStatus: 'PAYED',
            invoiceFileUploadId: upload.fileUploadId,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        expect(await fileUploadReferencedByGiftCardPdf(testDb, upload.fileUploadId)).toBe(true);
        expect(await fileUploadReferencedByGiftCardPdf(testDb, idCreate())).toBe(false);
    });

    it('detects a gift-card voucher file upload', async () => {
        const { requestingSession } = await commandSetup();
        const upload = await fileUploadCreate(testDb, {
            userId: null,
            filename: 'voucher.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF'),
        });

        await testDb.insert(giftCards).values({
            giftCardId: idCreate(),
            sessionId: requestingSession.sessionId,
            buyerEmail: 'buyer@example.com',
            locale: 'en',
            occasion: 'Birthday',
            recipientName: 'Ada Lovelace',
            message: '',
            originalBalanceCents: 5000,
            balanceCents: 5000,
            redeemCode: `TEST-${idCreate().slice(0, 8)}`,
            paymentIntentId: 'pi_test_voucher',
            paymentClientSecret: 'pi_test_voucher_secret',
            paymentStatus: 'PAYED',
            voucherFileUploadId: upload.fileUploadId,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        expect(await fileUploadReferencedByGiftCardPdf(testDb, upload.fileUploadId)).toBe(true);
    });

    it('detects an outbound-email attachment file upload', async () => {
        await commandSetup();
        const upload = await fileUploadCreate(testDb, {
            userId: null,
            filename: 'receipt.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF'),
        });
        const outboundEmailId = idCreate();
        await testDb.insert(outboundEmails).values({
            outboundEmailId,
            provider: 'console',
            purpose: 'GIFT_CARD_PURCHASED',
            toEmail: 'buyer@example.com',
            subject: 'Gift card',
            locale: 'en',
        });
        await testDb.insert(outboundEmailAttachments).values({
            outboundEmailId,
            fileUploadId: upload.fileUploadId,
            position: 0,
        });

        expect(await fileUploadReferencedByOutboundEmailAttachment(testDb, upload.fileUploadId)).toBe(true);
        expect(await fileUploadReferencedByOutboundEmailAttachment(testDb, idCreate())).toBe(false);
    });
});

describe('fileUploadContentAccess testimonial helpers', () => {
    it('detects published vs pending testimonial imageUrls', async () => {
        const { user } = await commandSetup.withUser();
        const publishedUpload = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'dinner.webp',
            mediaType: 'image/webp',
            bytes: Buffer.from('webp'),
        });
        const pendingUpload = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'pending.webp',
            mediaType: 'image/webp',
            bytes: Buffer.from('webp'),
        });

        await testDb.insert(customerTestimonials).values([
            {
                customerTestimonialId: idCreate(),
                userId: user.userId,
                body: 'Published dinner',
                imageUrls: [fileUploadPublicUrl(publishedUpload.fileUploadId)],
                publicationStatus: 'PUBLISHED',
                publishedAt: new Date(),
            },
            {
                customerTestimonialId: idCreate(),
                userId: user.userId,
                body: 'Pending dinner',
                imageUrls: [fileUploadPublicUrl(pendingUpload.fileUploadId)],
                publicationStatus: 'PENDING_REVIEW',
            },
        ]);

        expect(await fileUploadReferencedByPublishedTestimonial(testDb, publishedUpload.fileUploadId)).toBe(true);
        expect(await fileUploadReferencedByPublishedTestimonial(testDb, pendingUpload.fileUploadId)).toBe(false);
        expect(await fileUploadReferencedByAnyTestimonial(testDb, pendingUpload.fileUploadId)).toBe(true);
        expect(await fileUploadReferencedByAnyTestimonial(testDb, idCreate())).toBe(false);
    });
});

describe('fileUploadContentAccess offer meal images', () => {
    async function seedOfferWithDraftMealImage() {
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
        const stranger = await commandSetup.withUser({ firstName: 'Other', lastName: 'Person' });

        await testDb.insert(cooks).values({
            cookId: cook.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: berlin,
            travelExpensesAmount: 25,
            maximumTravelDistance: 100,
            stripeAccountId: 'acct_meal_image',
            stripeAccountActive: true,
        });

        const upload = await fileUploadCreate(testDb, {
            userId: cook.user.userId,
            filename: 'draft-steak.jpg',
            mediaType: 'image/jpeg',
            bytes: Buffer.from('steak'),
        });

        const mealId = idCreate();
        await testDb.insert(meals).values({
            mealId,
            cookId: cook.user.userId,
            title: 'Draft steak',
            description: 'Not published',
            imageFileUploadId: upload.fileUploadId,
            publishedAt: null,
        });

        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Birthday',
            dateTime: new Date('2026-12-15T18:00:00.000Z'),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        const bookingRequestOfferId = idCreate();
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId,
            bookingRequestId,
            cookId: cook.user.userId,
            cookAccepted: true,
            userAccepted: null,
            userUnreadNotificationCount: 0,
            cookUnreadNotificationCount: 0,
            menuPriceCents: 40_000,
            travelExpensesCents: 2_000,
            paymentProviderFeeCents: 800,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 4,
            platformFeeCentsCook: 7_200,
            platformFeeCentsCustomer: 1_600,
            payoutCentsCook: 34_800,
            totalWithoutDiscountsCentsCustomer: 45_000,
            totalCentsCustomer: 45_000,
            giftCardAppliedCents: 0,
            paymentStatus: 'EMPTY',
        });

        return { cook, customer, stranger, upload, mealId, bookingRequestOfferId };
    }

    it('lets the offer customer download a draft meal image via the offer menu', async () => {
        const seed = await seedOfferWithDraftMealImage();

        const menuId = idCreate();
        const courseId = idCreate();
        await testDb.insert(menus).values({
            menuId,
            cookId: seed.cook.user.userId,
            bookingRequestOfferId: seed.bookingRequestOfferId,
            title: 'Offer menu',
            description: 'Courses',
        });
        await testDb.insert(menuCourses).values({
            courseId,
            menuId,
            cookId: seed.cook.user.userId,
            index: 0,
            title: 'Main',
            mealSelectionLimit: 1,
        });
        await testDb.insert(menuCourseMealOptions).values({
            mealOptionId: idCreate(),
            courseId,
            cookId: seed.cook.user.userId,
            mealId: seed.mealId,
            index: 0,
        });

        expect(await fileUploadReferencedByPublishedMeal(testDb, seed.upload.fileUploadId)).toBe(false);
        expect(await fileUploadAccessibleViaBookingRequestOfferMeal(testDb, seed.upload.fileUploadId, seed.customer.user.userId)).toBe(
            true,
        );
        expect(await fileUploadAccessibleViaBookingRequestOfferMeal(testDb, seed.upload.fileUploadId, seed.cook.user.userId)).toBe(true);
        expect(await fileUploadAccessibleViaBookingRequestOfferMeal(testDb, seed.upload.fileUploadId, seed.stranger.user.userId)).toBe(
            false,
        );
    });

    it('lets the offer customer download a draft meal image via configuredMenu snapshot', async () => {
        const seed = await seedOfferWithDraftMealImage();
        const configuredMenu = {
            menuId: idCreate(),
            title: 'Configured',
            description: '',
            courses: [
                {
                    title: 'Main',
                    meals: [
                        {
                            mealTitle: 'Draft steak',
                            mealDescription: 'Not published',
                            mealImageUrl: fileUploadPublicUrl(seed.upload.fileUploadId),
                        },
                    ],
                },
            ],
        } satisfies BookingRequestOfferConfiguredMenu;

        await testDb
            .update(bookingRequestOffers)
            .set({ configuredMenu })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, seed.bookingRequestOfferId));

        expect(await fileUploadAccessibleViaBookingRequestOfferMeal(testDb, seed.upload.fileUploadId, seed.customer.user.userId)).toBe(
            true,
        );
        expect(await fileUploadAccessibleViaBookingRequestOfferMeal(testDb, seed.upload.fileUploadId, seed.stranger.user.userId)).toBe(
            false,
        );
    });
});
