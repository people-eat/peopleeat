/**
 * Same gate as offer chat: declines and canceled requests block calls / slots.
 * Dual-accept remains allowed.
 */
export function bookingRequestOfferCallWritableAssert(input: {
    offer: { userAccepted: boolean | null; cookAccepted: boolean | null };
    bookingRequest: { canceledAt: Date | null };
}): void {
    if (input.offer.userAccepted === false || input.offer.cookAccepted === false) {
        throw new Error('bookingRequestOfferCallWritableAssert: offer already declined');
    }
    if (input.bookingRequest.canceledAt != null) {
        throw new Error('bookingRequestOfferCallWritableAssert: booking request canceled');
    }
}
