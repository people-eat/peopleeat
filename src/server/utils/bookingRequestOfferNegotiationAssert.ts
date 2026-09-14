/**
 * Negotiation is open only while neither side has declined and dual-accept
 * has not landed yet. Used by accept / decline / price / menu commands.
 */
export function bookingRequestOfferNegotiationAssert(offer: { userAccepted: boolean | null; cookAccepted: boolean | null }): void {
    if (offer.userAccepted === false || offer.cookAccepted === false) {
        throw new Error('bookingRequestOfferNegotiationAssert: offer already declined');
    }
    if (offer.userAccepted === true && offer.cookAccepted === true) {
        throw new Error('bookingRequestOfferNegotiationAssert: offer already accepted');
    }
}
