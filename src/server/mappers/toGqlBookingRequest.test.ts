import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';

import type { BookingRequest, BookingRequestOffer } from '../db/schema';
import type { GqlSAdminCook } from '../graphql/generated';
import { toGqlAdminBookingRequestOffer } from './toGqlAdminBookingRequestOffer';
import { toGqlCookBookingRequestOffer } from './toGqlCookBookingRequestOffer';
import { toGqlUserBookingRequest } from './toGqlUserBookingRequest';
import { toGqlUserBookingRequestOffer } from './toGqlUserBookingRequestOffer';

config({ path: ['.env.test'] });

const bookingRequest = {
    bookingRequestId: 'br-1',
    userId: 'user-1',
    occasion: 'Birthday',
    dateTime: new Date('2026-10-01T18:00:00.000Z'),
    exactEventAddress: {
        displayText: 'Berlin',
        latitude: 52.5,
        longitude: 13.4,
        addressLine1: 'Street 1',
        addressLine2: '',
        city: 'Berlin',
        postCode: '10115',
        state: 'BE',
        country: 'DE',
    },
    priceClassType: 'MEDIUM',
    originalMessage: 'Hello',
    adjustedMessage: null,
    giftCardId: null,
    promoCodeId: null,
    expiresAt: null,
    canceledAt: null,
    cancellationReason: null,
    publicationStatus: 'PUBLICATION_AUTO_APPROVED',
    preferences: ['vegetarian'],
    invoiceAddress: null,
    references: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
} satisfies BookingRequest;

const offer = {
    bookingRequestOfferId: 'offer-1',
    bookingRequestId: 'br-1',
    cookId: 'cook-1',
    userAccepted: null,
    cookAccepted: true,
    userDeclinationReason: null,
    cookDeclinationReason: null,
    userUnreadNotificationCount: 1,
    cookUnreadNotificationCount: 0,
    priceAutoAdjustReason: null,
    userRequestedMenuAdjustments: null,
    travelDistanceKm: 12.5,
    menuPriceCents: 20_000,
    travelExpensesCents: 2_500,
    paymentProviderFeeCents: 500,
    platformFeePercentCook: 15,
    platformFeePercentCustomer: 10,
    platformFeeCentsCook: 3_000,
    platformFeeCentsCustomer: 1_000,
    payoutCentsCook: 17_000,
    totalWithoutDiscountsCentsCustomer: 24_000,
    totalCentsCustomer: null,
    giftCardAppliedCents: 0,
    configuredMenu: null,
    paymentData: null,
    paymentStatus: 'EMPTY',
    plannedPaymentPullDateTime: null,
    paymentDateTime: null,
    plannedPayoutDateTime: null,
    payoutDateTime: null,
    testimonialMemoryNudgeJobId: null,
    testimonialReminderMorningJobId: null,
    testimonialReminderEveningJobId: null,
    customerChatMessageNotifyJobId: null,
    cookChatMessageNotifyJobId: null,
    adminChatReviewPendingCount: 0,
    adminChatReviewedAt: null,
    preparationsCompletedAt: null,
    participantAmendment: null,
    createdAt: new Date('2026-08-02T00:00:00.000Z'),
} satisfies BookingRequestOffer;

const publicCook = {
    cookId: 'cook-1',
    user: { display: 'Anna', createdAt: new Date('2026-01-01T00:00:00.000Z'), profilePicture: null },
    hasPublicProfile: true,
    biography: 'Bio',
    biographySummary: 'Summary',
    cuisineStyle: null,
    cookingPhilosophy: null,
    city: 'Berlin',
    minimumPriceAmount: null,
    maximumPriceAmount: null,
    minimumParticipants: null,
    maximumParticipants: null,
    callSchedulingEnabled: false,
    callDurationMinutes: 30,
    callSlots: [],
    meals: [],
    testimonials: [],
    rating: { averageRating: null, reviewCount: 0 },
};

describe('toGqlCookBookingRequestOffer', () => {
    it('derives USER_NEEDS_TO_ACCEPT and builds costBreakdown', () => {
        const gql = toGqlCookBookingRequestOffer({
            offer,
            bookingRequest,
            hasAcceptedAlternative: false,
            locale: 'en',
            bookingRequestContext: {
                bookingRequestId: 'br-1',
                status: 'OFFERS_WAITING_FOR_REVIEW',
                occasion: 'Birthday',
                dateTime: bookingRequest.dateTime,
                exactEventAddress: {
                    displayText: 'Berlin',
                    latitude: 52.5,
                    longitude: 13.4,
                    addressLine1: 'Street 1',
                    addressLine2: '',
                    city: 'Berlin',
                    postCode: '10115',
                    state: 'BE',
                    country: 'DE',
                },
                priceClassType: 'MEDIUM',
                suggestedOfferAmountCents: 9400,
                minOfferAmountCents: 8000,
                maxOfferAmountCents: 10000,
                minOfferAmountHardCents: null,
                message: 'Hello',
                preferences: ['vegetarian'],
                expiresAt: null,
                canceledAt: null,
                participants: [],
                user: { display: 'Customer', createdAt: new Date('2026-01-01T00:00:00.000Z'), profilePicture: null },
            },
        });

        expect(gql.status).toBe('USER_NEEDS_TO_ACCEPT');
        expect(gql.menuPriceCents).toBe(20_000);
        expect(gql.costBreakdown.total?.amountCents).toBe(24_000);
        expect(gql.cookUnreadNotificationCount).toBe(0);
        expect(gql).not.toHaveProperty('userUnreadNotificationCount');
        expect(gql.suggestedMenus).toEqual([]);
        expect(gql.callBookings).toEqual([]);
        expect(gql.bookingRequest.occasion).toBe('Birthday');
    });
});

describe('toGqlAdminBookingRequestOffer', () => {
    it('includes applied promo discounts in costBreakdown', () => {
        const gql = toGqlAdminBookingRequestOffer({
            offer,
            bookingRequest,
            hasAcceptedAlternative: false,
            locale: 'de',
            cook: { cookId: 'cook-1' } as GqlSAdminCook,
            cookPayoutReady: true,
            cookPayoutBlockedReason: null,
            promoCode: {
                redeemCode: 'DEMO',
                amountCents: 5_000,
            },
            giftCard: null,
            participantCount: 4,
        });

        expect(gql.costBreakdown.lineItems).toEqual(
            expect.arrayContaining([expect.objectContaining({ title: 'Promocode DEMO', amountCents: -5_000 })]),
        );
        expect(gql.costBreakdown.totalBeforeDiscount?.amountCents).toBe(24_000);
        expect(gql.costBreakdown.total?.amountCents).toBe(19_000);
        expect(gql.costBreakdown.totalPerPerson?.amountCents).toBe(4_750);
    });

    it('builds Stripe Dashboard deep links from paymentData', () => {
        const gql = toGqlAdminBookingRequestOffer({
            offer: {
                ...offer,
                paymentData: {
                    setupIntentId: 'seti_admin',
                    paymentIntentId: 'pi_admin',
                    clientSecret: 'secret',
                },
            },
            bookingRequest,
            hasAcceptedAlternative: false,
            locale: 'de',
            cook: { cookId: 'cook-1' } as GqlSAdminCook,
            cookPayoutReady: true,
            cookPayoutBlockedReason: null,
        });

        expect(gql.stripePaymentIntentUrl).toContain('/test/payments/pi_admin');
        expect(gql.stripeSetupIntentUrl).toContain('/test/setup_intents/seti_admin');
    });
});

describe('toGqlUserBookingRequestOffer', () => {
    it('includes applied promo and gift discounts in costBreakdown', () => {
        const gql = toGqlUserBookingRequestOffer({
            offer,
            bookingRequest,
            hasAcceptedAlternative: false,
            locale: 'de',
            cook: publicCook,
            promoCode: {
                redeemCode: 'DEMO',
                amountCents: 5_000,
            },
            giftCard: null,
            participantCount: 4,
        });

        expect(gql.costBreakdown.lineItems).toEqual(
            expect.arrayContaining([expect.objectContaining({ title: 'Promocode DEMO', amountCents: -5_000 })]),
        );
        expect(gql.costBreakdown.totalBeforeDiscount?.amountCents).toBe(24_000);
        expect(gql.costBreakdown.total?.amountCents).toBe(19_000);
        expect(gql.costBreakdown.totalPerPerson?.amountCents).toBe(4_750);
    });
});

describe('toGqlUserBookingRequest', () => {
    it('derives OFFERS_WAITING_FOR_REVIEW and maps nested offers', () => {
        const gqlOffer = toGqlUserBookingRequestOffer({
            offer,
            bookingRequest,
            hasAcceptedAlternative: false,
            locale: 'de',
            cook: publicCook,
        });
        const gql = toGqlUserBookingRequest({
            bookingRequest,
            offers: [gqlOffer],
            locale: 'de',
        });

        expect(gql.status).toBe('OFFERS_WAITING_FOR_REVIEW');
        expect(gql.exactEventAddress.city).toBe('Berlin');
        expect(gql.offers).toHaveLength(1);
        expect(gql.offers[0]?.status).toBe('USER_NEEDS_TO_ACCEPT');
        expect(gql.offers[0]?.cook.cookId).toBe('cook-1');
        expect(gql.offers[0]?.userUnreadNotificationCount).toBe(1);
        expect(gql.offers[0]).not.toHaveProperty('cookUnreadNotificationCount');
    });
});
