import type { Locale } from '../../shared/locale';
import type { BookingRequest, BookingRequestOffer, BookingRequestParticipant } from '../db/schema';
import { bookingRequestStatusDerive } from '../domain/bookingRequest';
import type { GqlSCookBookingRequestOfferContext, GqlSPublicUser } from '../graphql/generated';
import { bookingRequestOfferInitialMessageResolve } from '../utils/bookingRequestOfferInitialChatMessage';
import { bookingRequestOfferPriceGuidanceFromRequest } from './bookingRequestOfferPriceGuidanceFromRequest';
import { toGqlBookingRequestParticipant } from './toGqlBookingRequestParticipant';
import { toGqlCookEventAddress } from './toGqlCook';
import { toGqlInvoiceAddress } from './toGqlInvoiceAddress';

export type ToGqlCookBookingRequestOfferContextInput = {
    bookingRequest: BookingRequest;
    participants?: BookingRequestParticipant[];
    acceptedOfferPaymentStatus?: BookingRequestOffer['paymentStatus'] | null;
    offerCount: number;
    locale: Locale;
    now?: Date;
    user: GqlSPublicUser;
    estimatedTravelExpensesCents?: number | null;
    promoMinimumTotalAmountCustomerCents?: number | null;
    /** Exact venue is only for this cook after both sides accepted their offer. */
    revealExactEventAddress?: boolean;
};

export function toGqlCookBookingRequestOfferContext(input: ToGqlCookBookingRequestOfferContextInput): GqlSCookBookingRequestOfferContext {
    const {
        bookingRequest,
        participants = [],
        acceptedOfferPaymentStatus,
        offerCount,
        now,
        user,
        estimatedTravelExpensesCents = null,
        promoMinimumTotalAmountCustomerCents = null,
        revealExactEventAddress = false,
    } = input;

    const guidance = bookingRequestOfferPriceGuidanceFromRequest({
        priceClassType: bookingRequest.priceClassType,
        participants,
        estimatedTravelExpensesCents,
        promoMinimumTotalAmountCustomerCents,
    });

    return {
        bookingRequestId: bookingRequest.bookingRequestId,
        status: bookingRequestStatusDerive({
            offerCount,
            acceptedOfferPaymentStatus: acceptedOfferPaymentStatus ?? null,
            canceledAt: bookingRequest.canceledAt,
            expiresAt: bookingRequest.expiresAt,
            eventDate: bookingRequest.dateTime,
            now,
        }),
        occasion: bookingRequest.occasion,
        dateTime: bookingRequest.dateTime,
        exactEventAddress: toGqlCookEventAddress(bookingRequest.exactEventAddress, {
            revealExact: revealExactEventAddress,
        }),
        priceClassType: bookingRequest.priceClassType ?? null,
        suggestedOfferAmountCents: guidance.suggestedOfferAmountCents,
        minOfferAmountCents: guidance.minOfferAmountCents,
        maxOfferAmountCents: guidance.maxOfferAmountCents,
        minOfferAmountHardCents: guidance.minOfferAmountHardCents,
        message: bookingRequestOfferInitialMessageResolve(bookingRequest),
        preferences: bookingRequest.preferences,
        invoiceAddress:
            revealExactEventAddress && bookingRequest.invoiceAddress ? toGqlInvoiceAddress(bookingRequest.invoiceAddress) : null,
        expiresAt: bookingRequest.expiresAt ?? null,
        canceledAt: bookingRequest.canceledAt ?? null,
        participants: participants.map(toGqlBookingRequestParticipant),
        user,
    };
}
