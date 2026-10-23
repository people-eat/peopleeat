import type { BookingRequest, BookingRequestOffer } from '../db/schema';
import type { BookingRequestOfferPaymentData, BookingRequestOfferPaymentStatus } from '../domain/bookingRequest';

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

export function bookingRequestOfferHasPendingDeltaPayment(paymentData: BookingRequestOfferPaymentData | null | undefined): boolean {
    return Boolean(paymentData && 'pendingDeltaPayment' in paymentData && paymentData.pendingDeltaPayment);
}

export type BookingRequestOfferAmendmentBlockReason =
    | 'CANCELED'
    | 'NOT_DUAL_ACCEPTED'
    | 'EVENT_PAST'
    | 'PAYMENT_STATUS'
    | 'PENDING_DELTA_PAYMENT'
    | 'PREPARATIONS_LOCKED'
    | 'PENDING_AMENDMENT'
    | 'PENDING_AMENDMENT_CLAIMED';

/** Why a post–dual-accept amendment cannot start (customer path treats any reason as blocked). */
export function bookingRequestOfferAmendmentBlockReason(input: {
    offer: Pick<
        BookingRequestOffer,
        'userAccepted' | 'cookAccepted' | 'paymentStatus' | 'paymentData' | 'preparationsCompletedAt' | 'participantAmendment'
    >;
    bookingRequest: Pick<BookingRequest, 'dateTime' | 'canceledAt'>;
    now?: Date;
}): BookingRequestOfferAmendmentBlockReason | null {
    const { offer, bookingRequest, now = new Date() } = input;
    if (bookingRequest.canceledAt != null) return 'CANCELED';
    if (!bookingRequestOfferIsDualAccepted(offer)) return 'NOT_DUAL_ACCEPTED';
    if (!bookingRequestOfferEventIsInFuture(bookingRequest, now)) return 'EVENT_PAST';
    if (!bookingRequestOfferParticipantAmendmentPaymentAllowed(offer.paymentStatus)) return 'PAYMENT_STATUS';
    if (bookingRequestOfferHasPendingDeltaPayment(offer.paymentData)) return 'PENDING_DELTA_PAYMENT';
    if (offer.preparationsCompletedAt != null) return 'PREPARATIONS_LOCKED';
    if (offer.participantAmendment != null) {
        return offer.participantAmendment.claimedAt ? 'PENDING_AMENDMENT_CLAIMED' : 'PENDING_AMENDMENT';
    }
    return null;
}

/** Customer may propose a participant amendment (feature toggle checked separately). */
export function bookingRequestOfferCanRequestParticipantAmendment(input: {
    offer: Pick<
        BookingRequestOffer,
        'userAccepted' | 'cookAccepted' | 'paymentStatus' | 'paymentData' | 'preparationsCompletedAt' | 'participantAmendment'
    >;
    bookingRequest: Pick<BookingRequest, 'dateTime' | 'canceledAt'>;
    now?: Date;
}): boolean {
    return bookingRequestOfferAmendmentBlockReason(input) == null;
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
