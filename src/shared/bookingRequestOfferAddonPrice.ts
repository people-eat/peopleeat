/**
 * Shared helpers for offer-addon unit totals (isomorphic — used by web previews
 * and server reprice). See docs/features/booking-offer-addons.md.
 */

import { bookingRequestOfferAddonPriceCentsCalculate } from './bookingRequestOfferPrice';

export type OfferAddonPricingUnit = 'FLAT' | 'PER_PERSON';

export function bookingRequestOfferAddonLineAmountCents(input: {
    pricingUnit: OfferAddonPricingUnit;
    priceCents: number;
    paidParticipants: number;
}): number {
    return bookingRequestOfferAddonPriceCentsCalculate(
        [{ pricingUnit: input.pricingUnit, priceCents: input.priceCents, selected: true }],
        input.paidParticipants,
    );
}
