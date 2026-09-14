import type { BookingRequestOfferPriceResult } from '../../shared/bookingRequestOfferPrice';

/** Throws when customer total is below a promo hard minimum. Soft price-class bounds are UX-only. */
export function bookingRequestOfferHardMinimumAssert(
    price: Pick<BookingRequestOfferPriceResult, 'totalWithoutDiscountsCentsCustomer'>,
    minOfferAmountHardCents: number | null | undefined,
    context: string,
): void {
    if (minOfferAmountHardCents == null) return;
    if (price.totalWithoutDiscountsCentsCustomer < minOfferAmountHardCents) {
        throw new Error(`${context}: customer total is below the promo hard minimum`);
    }
}
