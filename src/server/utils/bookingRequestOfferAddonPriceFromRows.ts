import { bookingRequestOfferAddonPriceCentsCalculate } from '../../shared/bookingRequestOfferPrice';
import type { CookOfferAddon } from '../db/schema';

/** Sum selected offer-scoped addon rows into `addonPriceCents`. */
export function bookingRequestOfferAddonPriceFromRows(
    rows: ReadonlyArray<Pick<CookOfferAddon, 'pricingUnit' | 'priceCents' | 'customerSelected'>>,
    paidParticipants: number,
): number {
    return bookingRequestOfferAddonPriceCentsCalculate(
        rows.map((row) => ({
            pricingUnit: row.pricingUnit,
            priceCents: row.priceCents,
            selected: row.customerSelected,
        })),
        paidParticipants,
    );
}
