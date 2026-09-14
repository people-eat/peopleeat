/**
 * Offer chat composer is open for every derived status except decline / cancel.
 * Post-accept (payment, event, completed) stays sendable; EXPIRED /
 * USER_CHOOSE_DIFFERENT_OFFER stay open for now.
 */
const BOOKING_REQUEST_OFFER_CHAT_CLOSED_STATUSES = new Set(['USER_DECLINED', 'COOK_DECLINED', 'CANCELED']);

export function bookingRequestOfferChatCanSend(status: string): boolean {
    return !BOOKING_REQUEST_OFFER_CHAT_CLOSED_STATUSES.has(status);
}
