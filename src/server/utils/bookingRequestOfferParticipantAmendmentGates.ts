import type { BookingRequest, BookingRequestOffer } from '../db/schema';
import type { BookingRequestOfferPaymentStatus } from '../domain/bookingRequest';

const AMENDMENT_ALLOWED_PAYMENT_STATUSES = new Set<BookingRequestOfferPaymentStatus>(['EMPTY', 'SETUP', 'PAYED']);

export function bookingRequestOfferParticipantAmendmentPaymentAllowed(paymentStatus: BookingRequestOfferPaymentStatus): boolean {
    return AMENDMENT_ALLOWED_PAYMENT_STATUSES.has(paymentStatus);
}

export function bookingRequestOfferIsDualAccepted(offer: Pick<BookingRequestOffer, 'userAccepted' | 'cookAccepted'>): boolean {
    return offer.userAccepted === true && offer.cookAccepted === true;
}

function bookingRequestOfferEventIsInFuture(bookingRequest: Pick<BookingRequest, 'dateTime'>, now = new Date()): boolean {
    return bookingRequest.dateTime.getTime() > now.getTime();
}

/** Customer may propose a participant amendment (feature toggle checked separately). */
export function bookingRequestOfferCanRequestParticipantAmendment(input: {
    offer: Pick<
        BookingRequestOffer,
        'userAccepted' | 'cookAccepted' | 'paymentStatus' | 'preparationsCompletedAt' | 'participantAmendment'
    >;
    bookingRequest: Pick<BookingRequest, 'dateTime' | 'canceledAt'>;
    now?: Date;
}): boolean {
    const { offer, bookingRequest, now = new Date() } = input;
    if (bookingRequest.canceledAt != null) return false;
    if (!bookingRequestOfferIsDualAccepted(offer)) return false;
    if (!bookingRequestOfferEventIsInFuture(bookingRequest, now)) return false;
    if (!bookingRequestOfferParticipantAmendmentPaymentAllowed(offer.paymentStatus)) return false;
    if (offer.preparationsCompletedAt != null) return false;
    if (offer.participantAmendment != null) return false;
    return true;
}

/** Cook may mark preparations / groceries done (feature toggle checked separately). */
export function bookingRequestOfferCanCompletePreparations(input: {
    offer: Pick<BookingRequestOffer, 'userAccepted' | 'cookAccepted' | 'preparationsCompletedAt' | 'participantAmendment'>;
    bookingRequest: Pick<BookingRequest, 'dateTime' | 'canceledAt'>;
    now?: Date;
}): boolean {
    const { offer, bookingRequest, now = new Date() } = input;
    if (bookingRequest.canceledAt != null) return false;
    if (!bookingRequestOfferIsDualAccepted(offer)) return false;
    if (!bookingRequestOfferEventIsInFuture(bookingRequest, now)) return false;
    if (offer.preparationsCompletedAt != null) return false;
    if (offer.participantAmendment != null) return false;
    return true;
}
