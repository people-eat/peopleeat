import type { BookingRequestOffer } from '../db/schema';

/** True when the offer already has a completed cook bank payout (Stripe or out-of-system). */
export function bookingRequestOfferPayoutAlreadyDone(offer: Pick<BookingRequestOffer, 'paymentStatus' | 'payoutDateTime'>): boolean {
    if (offer.payoutDateTime != null) return true;
    return offer.paymentStatus === 'TRANSFERRED' || offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM';
}
