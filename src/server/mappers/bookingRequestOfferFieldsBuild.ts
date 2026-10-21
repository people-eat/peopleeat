import type { Locale } from '../../shared/locale';
import type { BookingRequest, BookingRequestOffer, BookingRequestParticipant, CookCallSlotBooking } from '../db/schema';
import { bookingRequestOfferStatusDerive } from '../domain/bookingRequest';
import { bookingRequestOfferCostBreakdownBuild } from '../domain/bookingRequestOfferCostBreakdown';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type {
    GqlSBookingRequestOfferConfiguredMenu,
    GqlSBookingRequestOfferParticipantAmendment,
    GqlSBookingRequestOfferPayment,
    GqlSBookingRequestOfferPaymentDataType,
    GqlSBookingRequestOfferPaymentStatus,
    GqlSBookingRequestOfferStatus,
    GqlSCookCallSlotBooking,
    GqlSCostBreakdown,
} from '../graphql/generated';
import {
    bookingRequestOfferCanCompletePreparations,
    bookingRequestOfferCanRequestParticipantAmendment,
} from '../utils/bookingRequestOfferParticipantAmendmentGates';
import { toGqlBookingRequestOfferConfiguredMenu } from './toGqlBookingRequestOfferConfiguredMenu';
import { toGqlBookingRequestOfferParticipantAmendment } from './toGqlBookingRequestOfferParticipantAmendment';
import { toGqlCookCallSlotBooking } from './toGqlCookCallSlotBooking';
import { toGqlCostBreakdown } from './toGqlCostBreakdown';

export type BookingRequestOfferFieldsInput = {
    offer: BookingRequestOffer;
    bookingRequest: Pick<BookingRequest, 'dateTime' | 'expiresAt' | 'canceledAt'>;
    hasAcceptedAlternative: boolean;
    locale: Locale;
    participantCount?: number | null;
    participants?: Pick<BookingRequestParticipant, 'type' | 'name' | 'restrictions'>[];
    promoCode?: { redeemCode: string; amountCents: number } | null;
    giftCard?: { redeemCode: string; balanceCents: number } | null;
    callBookings?: CookCallSlotBooking[];
    now?: Date;
};

export type BookingRequestOfferFields = {
    bookingRequestOfferId: string;
    bookingRequestId: string;
    cookId: string;
    status: GqlSBookingRequestOfferStatus;
    paymentStatus: GqlSBookingRequestOfferPaymentStatus;
    userAccepted: boolean | null;
    cookAccepted: boolean | null;
    userDeclinationReason: string | null;
    cookDeclinationReason: string | null;
    userUnreadNotificationCount: number;
    cookUnreadNotificationCount: number;
    priceAutoAdjustReason: 'PARTICIPANTS' | 'TRAVEL' | 'PARTICIPANTS_AND_TRAVEL' | 'UNKNOWN' | null;
    userRequestedMenuAdjustments: boolean | null;
    travelDistanceKm: number | null;
    menuPriceCents: number;
    travelExpensesCents: number;
    paymentProviderFeeCents: number;
    platformFeePercentCook: number;
    platformFeePercentCustomer: number;
    platformFeeCentsCook: number;
    platformFeeCentsCustomer: number;
    payoutCentsCook: number;
    totalWithoutDiscountsCentsCustomer: number;
    totalCentsCustomer: number | null;
    costBreakdown: GqlSCostBreakdown;
    configuredMenu: GqlSBookingRequestOfferConfiguredMenu | null;
    payment: GqlSBookingRequestOfferPayment | null;
    plannedPaymentPullDateTime: Date | null;
    paymentDateTime: Date | null;
    plannedPayoutDateTime: Date | null;
    payoutDateTime: Date | null;
    createdAt: Date;
    callBookings: GqlSCookCallSlotBooking[];
    preparationsCompletedAt: Date | null;
    participantAmendment: GqlSBookingRequestOfferParticipantAmendment | null;
    canRequestParticipantAmendment: boolean;
    canCompletePreparations: boolean;
};

function bookingRequestOfferPaymentDataTypeDerive(
    paymentData: BookingRequestOffer['paymentData'],
): GqlSBookingRequestOfferPaymentDataType | null {
    if (!paymentData || !('clientSecret' in paymentData)) {
        return null;
    }
    if ('paymentIntentId' in paymentData && paymentData.paymentIntentId) {
        return 'PAYMENT_INTENT';
    }
    if ('setupIntentId' in paymentData && paymentData.setupIntentId) {
        return 'SETUP_INTENT';
    }
    return null;
}

export function bookingRequestOfferFieldsBuild(input: BookingRequestOfferFieldsInput): BookingRequestOfferFields {
    const {
        offer,
        bookingRequest,
        hasAcceptedAlternative,
        locale,
        participantCount,
        participants = [],
        promoCode,
        giftCard,
        callBookings = [],
        now,
    } = input;

    const status = bookingRequestOfferStatusDerive({
        userAccepted: offer.userAccepted ?? null,
        cookAccepted: offer.cookAccepted ?? null,
        userRequestedMenuAdjustments: offer.userRequestedMenuAdjustments ?? null,
        paymentStatus: offer.paymentStatus,
        paymentDataPresent: Boolean(offer.paymentData),
        bookingRequestCanceledAt: bookingRequest.canceledAt,
        bookingRequestExpiresAt: bookingRequest.expiresAt,
        bookingRequestDateTime: bookingRequest.dateTime,
        hasAcceptedAlternative,
        now,
    });

    const costBreakdown = bookingRequestOfferCostBreakdownBuild({
        locale,
        menuPriceCents: offer.menuPriceCents,
        travelExpensesCents: offer.travelExpensesCents,
        platformFeeCentsCustomer: offer.platformFeeCentsCustomer,
        paymentProviderFeeCents: offer.paymentProviderFeeCents,
        totalWithoutDiscountsCentsCustomer: offer.totalWithoutDiscountsCentsCustomer,
        totalCentsCustomer: offer.totalCentsCustomer,
        participantCount,
        promoCode,
        giftCard,
    });

    const pendingDelta =
        offer.paymentData && 'pendingDeltaPayment' in offer.paymentData ? offer.paymentData.pendingDeltaPayment : undefined;
    const paymentType = pendingDelta ? ('PAYMENT_INTENT' as const) : bookingRequestOfferPaymentDataTypeDerive(offer.paymentData);
    const clientSecret = pendingDelta?.clientSecret
        ? pendingDelta.clientSecret
        : offer.paymentData && 'clientSecret' in offer.paymentData
          ? offer.paymentData.clientSecret
          : null;
    const paymentEligible = clientSecret != null && paymentType != null && (offer.paymentStatus === 'EMPTY' || pendingDelta != null);
    const publishableKey = environmentVariables.stripePublishableKey;
    if (paymentEligible && !publishableKey) {
        // Accept prepared Stripe SI/PI, but Elements cannot mount without the publishable key.
        console.error(
            `bookingRequestOfferFieldsBuild: STRIPE_PUBLISHABLE_KEY missing; withholding payment client data for offer ${offer.bookingRequestOfferId}`,
        );
    }

    return {
        bookingRequestOfferId: offer.bookingRequestOfferId,
        bookingRequestId: offer.bookingRequestId,
        cookId: offer.cookId,
        status,
        paymentStatus: offer.paymentStatus,
        userAccepted: offer.userAccepted ?? null,
        cookAccepted: offer.cookAccepted ?? null,
        userDeclinationReason: offer.userDeclinationReason ?? null,
        cookDeclinationReason: offer.cookDeclinationReason ?? null,
        userUnreadNotificationCount: offer.userUnreadNotificationCount,
        cookUnreadNotificationCount: offer.cookUnreadNotificationCount,
        priceAutoAdjustReason: offer.priceAutoAdjustReason ?? null,
        userRequestedMenuAdjustments: offer.userRequestedMenuAdjustments ?? null,
        travelDistanceKm: offer.travelDistanceKm ?? null,
        menuPriceCents: offer.menuPriceCents,
        travelExpensesCents: offer.travelExpensesCents,
        paymentProviderFeeCents: offer.paymentProviderFeeCents,
        platformFeePercentCook: offer.platformFeePercentCook,
        platformFeePercentCustomer: offer.platformFeePercentCustomer,
        platformFeeCentsCook: offer.platformFeeCentsCook,
        platformFeeCentsCustomer: offer.platformFeeCentsCustomer,
        payoutCentsCook: offer.payoutCentsCook,
        totalWithoutDiscountsCentsCustomer: offer.totalWithoutDiscountsCentsCustomer,
        totalCentsCustomer: offer.totalCentsCustomer ?? null,
        costBreakdown: toGqlCostBreakdown(costBreakdown),
        configuredMenu: offer.configuredMenu ? toGqlBookingRequestOfferConfiguredMenu(offer.configuredMenu) : null,
        payment:
            paymentEligible && publishableKey
                ? {
                      clientSecret,
                      publishableKey,
                      type: paymentType,
                  }
                : null,
        plannedPaymentPullDateTime: offer.plannedPaymentPullDateTime ?? null,
        paymentDateTime: offer.paymentDateTime ?? null,
        plannedPayoutDateTime: offer.plannedPayoutDateTime ?? null,
        payoutDateTime: offer.payoutDateTime ?? null,
        createdAt: offer.createdAt,
        callBookings: callBookings.map((booking) => toGqlCookCallSlotBooking(booking)),
        preparationsCompletedAt: offer.preparationsCompletedAt ?? null,
        participantAmendment:
            offer.participantAmendment != null
                ? toGqlBookingRequestOfferParticipantAmendment({
                      amendment: offer.participantAmendment,
                      offer,
                      currentParticipants: participants,
                      giftCardBalanceCents: giftCard?.balanceCents ?? 0,
                      promoAmountCents: promoCode?.amountCents ?? 0,
                  })
                : null,
        canRequestParticipantAmendment: bookingRequestOfferCanRequestParticipantAmendment({
            offer,
            bookingRequest,
            now,
        }),
        canCompletePreparations: bookingRequestOfferCanCompletePreparations({
            offer,
            bookingRequest,
            now,
        }),
    };
}
