import type { BookingRequest, BookingRequestOffer, BookingRequestParticipant, GiftCard, PromoCode } from '../db/schema';
import { bookingRequestStatusDerive } from '../domain/bookingRequest';
import type {
    GqlSAdminBookingRequest,
    GqlSAdminBookingRequestOffer,
    GqlSAdminCook,
    GqlSAdminSession,
    GqlSAdminUser,
    GqlSBookingRequestRequestedMenu,
    GqlSFileUpload,
} from '../graphql/generated';
import { bookingRequestOfferPriceGuidanceFromRequest } from './bookingRequestOfferPriceGuidanceFromRequest';
import { toGqlBookingRequestKitchenDetails } from './toGqlBookingRequestKitchenDetails';
import { toGqlBookingRequestParticipant } from './toGqlBookingRequestParticipant';
import { toGqlCookTravelOriginAddress } from './toGqlCook';
import { toGqlInvoiceAddress } from './toGqlInvoiceAddress';

export type ToGqlAdminBookingRequestInput = {
    bookingRequest: BookingRequest;
    participants?: BookingRequestParticipant[];
    offers: GqlSAdminBookingRequestOffer[];
    acceptedOfferPaymentStatus?: BookingRequestOffer['paymentStatus'] | null;
    now?: Date;
    customer: GqlSAdminUser;
    cook: GqlSAdminCook | null;
    promoCode?: PromoCode | null;
    giftCard?: GiftCard | null;
    promoMinimumTotalAmountCustomerCents?: number | null;
    kitchenDetailsPhotos?: GqlSFileUpload[];
    requestedCook?: GqlSAdminCook | null;
    requestedMenu?: GqlSBookingRequestRequestedMenu | null;
    creatingSession?: GqlSAdminSession | null;
};

export function toGqlAdminBookingRequest(input: ToGqlAdminBookingRequestInput): GqlSAdminBookingRequest {
    const {
        bookingRequest,
        participants = [],
        offers,
        acceptedOfferPaymentStatus,
        now,
        customer,
        cook,
        promoCode,
        giftCard,
        promoMinimumTotalAmountCustomerCents = null,
        kitchenDetailsPhotos = [],
        requestedCook = null,
        requestedMenu = null,
        creatingSession,
    } = input;

    const guidance = bookingRequestOfferPriceGuidanceFromRequest({
        priceClassType: bookingRequest.priceClassType,
        participants,
        estimatedTravelExpensesCents: 0,
        promoMinimumTotalAmountCustomerCents,
    });

    return {
        bookingRequestId: bookingRequest.bookingRequestId,
        userId: bookingRequest.userId,
        status: bookingRequestStatusDerive({
            offerCount: offers.length,
            acceptedOfferPaymentStatus: acceptedOfferPaymentStatus ?? null,
            canceledAt: bookingRequest.canceledAt,
            expiresAt: bookingRequest.expiresAt,
            eventDate: bookingRequest.dateTime,
            now,
        }),
        occasion: bookingRequest.occasion,
        dateTime: bookingRequest.dateTime,
        exactEventAddress: toGqlCookTravelOriginAddress(bookingRequest.exactEventAddress),
        setting: bookingRequest.setting ?? null,
        kitchenDetails: toGqlBookingRequestKitchenDetails(bookingRequest.kitchenDetails, kitchenDetailsPhotos),
        priceClassType: bookingRequest.priceClassType ?? null,
        suggestedOfferAmountCents: guidance.suggestedOfferAmountCents,
        minOfferAmountCents: guidance.minOfferAmountCents,
        maxOfferAmountCents: guidance.maxOfferAmountCents,
        minOfferAmountHardCents: guidance.minOfferAmountHardCents,
        originalMessage: bookingRequest.originalMessage,
        adjustedMessage: bookingRequest.adjustedMessage ?? null,
        publicationStatus: bookingRequest.publicationStatus,
        requestedCook,
        requestedMenu,
        preferences: bookingRequest.preferences,
        invoiceAddress: bookingRequest.invoiceAddress ? toGqlInvoiceAddress(bookingRequest.invoiceAddress) : null,
        expiresAt: bookingRequest.expiresAt ?? null,
        canceledAt: bookingRequest.canceledAt ?? null,
        cancellationReason: bookingRequest.cancellationReason ?? null,
        createdAt: bookingRequest.createdAt,
        participants: participants.map(toGqlBookingRequestParticipant),
        offers,
        customer,
        cook,
        promoCode: promoCode
            ? {
                  promoCodeId: promoCode.promoCodeId,
                  redeemCode: promoCode.redeemCode,
                  amountCents: promoCode.amountCents,
              }
            : null,
        giftCard: giftCard
            ? {
                  giftCardId: giftCard.giftCardId,
                  redeemCode: giftCard.redeemCode,
                  balanceCents: giftCard.balanceCents,
              }
            : null,
        // Hydrate sets this (null when none). Field resolver falls back to
        // findOne when undefined (not loaded).
        creatingSession,
        // Lazy via `AdminBookingRequest.cooksInTravelRadius` field resolver.
        cooksInTravelRadius: [],
        // Lazy via `AdminBookingRequest.queuedJobs` field resolver.
        queuedJobs: [],
        // Lazy via `AdminBookingRequest.travelImpact` / `priceImpact` field resolvers.
        travelImpact: [],
        priceImpact: [],
    };
}
