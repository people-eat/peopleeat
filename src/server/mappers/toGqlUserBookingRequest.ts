import type { Locale } from '../../shared/locale';
import type { BookingRequest, BookingRequestOffer, BookingRequestParticipant, GiftCard, PromoCode } from '../db/schema';
import { bookingRequestStatusDerive } from '../domain/bookingRequest';
import type { GqlSUserBookingRequest, GqlSUserBookingRequestOffer } from '../graphql/generated';
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
    locale: Locale;
    now?: Date;
};

export function toGqlUserBookingRequest(input: ToGqlUserBookingRequestInput): GqlSUserBookingRequest {
    const { bookingRequest, participants = [], offers, acceptedOfferPaymentStatus, promoCode, giftCard, now } = input;

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
        priceClassType: bookingRequest.priceClassType ?? null,
        originalMessage: bookingRequest.originalMessage,
        adjustedMessage: bookingRequest.adjustedMessage ?? null,
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
