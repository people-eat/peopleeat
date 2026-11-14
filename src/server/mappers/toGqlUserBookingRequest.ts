import type { BookingRequest, BookingRequestOffer, BookingRequestParticipant, GiftCard, PromoCode } from '../db/schema';
import { bookingRequestDirectNeedsExpansion, bookingRequestIsExclusive, bookingRequestStatusDerive } from '../domain/bookingRequest';
import type {
    GqlSBookingRequestRequestedMenu,
    GqlSFileUpload,
    GqlSPublicCook,
    GqlSUserBookingRequest,
    GqlSUserBookingRequestOffer,
} from '../graphql/generated';
import { toGqlBookingRequestKitchenDetails } from './toGqlBookingRequestKitchenDetails';
import { toGqlBookingRequestParticipant } from './toGqlBookingRequestParticipant';
import { toGqlCookTravelOriginAddress } from './toGqlCook';
import { toGqlInvoiceAddress } from './toGqlInvoiceAddress';

export type ToGqlUserBookingRequestInput = {
    bookingRequest: BookingRequest;
    participants?: BookingRequestParticipant[];
    offers: GqlSUserBookingRequestOffer[];
    acceptedOfferPaymentStatus?: BookingRequestOffer['paymentStatus'] | null;
    promoCode?: PromoCode | null;
    giftCard?: GiftCard | null;
    now?: Date;
    kitchenDetailsPhotos?: GqlSFileUpload[];
    requestedCook?: GqlSPublicCook | null;
    requestedCookDeclined?: boolean;
    requestedCookBanned?: boolean;
    requestedMenu?: GqlSBookingRequestRequestedMenu | null;
};

export function toGqlUserBookingRequest(input: ToGqlUserBookingRequestInput): GqlSUserBookingRequest {
    const {
        bookingRequest,
        participants = [],
        offers,
        acceptedOfferPaymentStatus,
        promoCode,
        giftCard,
        now,
        kitchenDetailsPhotos = [],
        requestedCook = null,
        requestedCookDeclined = false,
        requestedCookBanned = false,
        requestedMenu = null,
    } = input;

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
        originalMessage: bookingRequest.originalMessage,
        adjustedMessage: bookingRequest.adjustedMessage ?? null,
        requestedCook,
        requestedMenu,
        isExclusive: bookingRequestIsExclusive(bookingRequest.publicationStatus),
        directRequestNeedsExpansion: bookingRequestDirectNeedsExpansion({
            publicationStatus: bookingRequest.publicationStatus,
            requestedCookDeclined,
            requestedCookBanned,
            offers: offers.map((offer) => ({
                cookAccepted: offer.cookAccepted ?? null,
                userAccepted: offer.userAccepted ?? null,
            })),
        }),
        preferences: bookingRequest.preferences,
        invoiceAddress: bookingRequest.invoiceAddress ? toGqlInvoiceAddress(bookingRequest.invoiceAddress) : null,
        expiresAt: bookingRequest.expiresAt ?? null,
        canceledAt: bookingRequest.canceledAt ?? null,
        cancellationReason: bookingRequest.cancellationReason ?? null,
        createdAt: bookingRequest.createdAt,
        participants: participants.map(toGqlBookingRequestParticipant),
        offers,
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
        travelImpact: [],
        priceImpact: [],
        // resolved fields
        supportRequest: null,
    };
}
