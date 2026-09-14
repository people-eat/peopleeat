/**
 * Offer chat stays writable after dual-accept. Only decline (either accept
 * flag false) or a canceled booking request block sends.
 */
export function bookingRequestOfferChatWritableAssert(input: {
    offer: { userAccepted: boolean | null; cookAccepted: boolean | null };
    bookingRequest: { canceledAt: Date | null };
}): void {
    if (input.offer.userAccepted === false || input.offer.cookAccepted === false) {
        throw new Error('bookingRequestOfferChatWritableAssert: offer already declined');
    }
    if (input.bookingRequest.canceledAt != null) {
        throw new Error('bookingRequestOfferChatWritableAssert: booking request canceled');
    }
}
