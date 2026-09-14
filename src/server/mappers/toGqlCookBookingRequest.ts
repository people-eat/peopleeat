import { bookingRequestSuggestedCookPayoutCents } from '../../shared/bookingRequestOfferPrice';
import type { Locale } from '../../shared/locale';
import type { BookingRequest, BookingRequestOffer, BookingRequestParticipant } from '../db/schema';
import { bookingRequestStatusDerive } from '../domain/bookingRequest';
import type {
    GqlSBookingRequestCookPoolDetails,
    GqlSCookBookingRequest,
    GqlSCookBookingRequestOffer,
    GqlSPublicUser,
} from '../graphql/generated';
import { bookingRequestOfferInitialMessageResolve } from '../utils/bookingRequestOfferInitialChatMessage';
import {
    bookingRequestOfferPriceGuidanceFromRequest,
    bookingRequestParticipantCounts,
} from './bookingRequestOfferPriceGuidanceFromRequest';
import { toGqlBookingRequestParticipant } from './toGqlBookingRequestParticipant';
import { toGqlCookEventAddress } from './toGqlCook';
import { toGqlInvoiceAddress } from './toGqlInvoiceAddress';

export type ToGqlCookBookingRequestInput = {
    bookingRequest: BookingRequest;
    participants?: BookingRequestParticipant[];
    offers?: GqlSCookBookingRequestOffer[];
    acceptedOfferPaymentStatus?: BookingRequestOffer['paymentStatus'] | null;
    locale: Locale;
    now?: Date;
    user: GqlSPublicUser;
    estimatedTravelDistanceKm?: number | null;
    estimatedTravelExpensesCents?: number | null;
    promoMinimumTotalAmountCustomerCents?: number | null;
    cookPoolDetails?: GqlSBookingRequestCookPoolDetails | null;
};

export function toGqlCookBookingRequest(input: ToGqlCookBookingRequestInput): GqlSCookBookingRequest {
    const {
        bookingRequest,
        participants = [],
        offers = [],
        acceptedOfferPaymentStatus,
        now,
        user,
        estimatedTravelDistanceKm = null,
        estimatedTravelExpensesCents = null,
        promoMinimumTotalAmountCustomerCents = null,
        cookPoolDetails = null,
    } = input;

    const travelExpensesCents = estimatedTravelExpensesCents ?? 0;
    const guidance = bookingRequestOfferPriceGuidanceFromRequest({
        priceClassType: bookingRequest.priceClassType,
        participants,
        estimatedTravelExpensesCents: travelExpensesCents,
        promoMinimumTotalAmountCustomerCents,
    });
    const { participantsAdult, participantsDiscounted } = bookingRequestParticipantCounts(participants);
    const estimatedCookPayoutCents = bookingRequestSuggestedCookPayoutCents({
        suggestedOfferAmountCents: guidance.suggestedOfferAmountCents,
        participantsAdult,
        participantsDiscounted,
        estimatedTravelExpensesCents: travelExpensesCents,
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
        // Pool / open requests never reveal the street — only after dual-accept on the cook's offer.
        exactEventAddress: toGqlCookEventAddress(bookingRequest.exactEventAddress, { revealExact: false }),
        priceClassType: bookingRequest.priceClassType ?? null,
        suggestedOfferAmountCents: guidance.suggestedOfferAmountCents,
        minOfferAmountCents: guidance.minOfferAmountCents,
        maxOfferAmountCents: guidance.maxOfferAmountCents,
        minOfferAmountHardCents: guidance.minOfferAmountHardCents,
        message: bookingRequestOfferInitialMessageResolve(bookingRequest),
        preferences: bookingRequest.preferences,
        invoiceAddress: bookingRequest.invoiceAddress ? toGqlInvoiceAddress(bookingRequest.invoiceAddress) : null,
        expiresAt: bookingRequest.expiresAt ?? null,
        canceledAt: bookingRequest.canceledAt ?? null,
        cancellationReason: bookingRequest.cancellationReason ?? null,
        createdAt: bookingRequest.createdAt,
        participants: participants.map(toGqlBookingRequestParticipant),
        offers,
        user,
        estimatedTravelDistanceKm,
        estimatedTravelExpensesCents,
        estimatedCookPayoutCents,
        cookPoolDetails,
    };
}
