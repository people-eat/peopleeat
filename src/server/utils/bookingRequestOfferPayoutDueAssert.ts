import type { BookingRequestOffer } from '../db/schema';

/**
 * Asserts the offer is `PAYED` and past `plannedPayoutDateTime` (due for admin release).
 */
export function bookingRequestOfferPayoutDueAssert(
    offer: Pick<BookingRequestOffer, 'paymentStatus' | 'plannedPayoutDateTime'>,
    commandName: string,
    now: Date = new Date(),
): void {
    if (offer.paymentStatus !== 'PAYED') {
        throw new Error(`${commandName}: offer paymentStatus must be PAYED`);
    }
    if (offer.plannedPayoutDateTime == null) {
        throw new Error(`${commandName}: offer has no plannedPayoutDateTime`);
    }
    if (offer.plannedPayoutDateTime.getTime() > now.getTime()) {
        throw new Error(`${commandName}: plannedPayoutDateTime is still in the future`);
    }
}
