/** Fee columns for `COOK_CHANGED_PRICE` / `SYSTEM_CHANGED_PRICE` event payloads. */
export function bookingRequestOfferPriceSnapshot(offer: {
    platformFeePercentCook: number;
    platformFeePercentCustomer: number;
    travelExpensesCents: number;
    menuPriceCents: number;
    paymentProviderFeeCents: number;
    platformFeeCentsCook: number;
    platformFeeCentsCustomer: number;
    payoutCentsCook: number;
    totalWithoutDiscountsCentsCustomer: number;
}): {
    platformFeePercentCook: number;
    platformFeePercentCustomer: number;
    travelExpensesCents: number;
    menuPriceCents: number;
    paymentProviderFeeCents: number;
    platformFeeCentsCook: number;
    platformFeeCentsCustomer: number;
    payoutCentsCook: number;
    totalWithoutDiscountsCentsCustomer: number;
} {
    return {
        platformFeePercentCook: offer.platformFeePercentCook,
        platformFeePercentCustomer: offer.platformFeePercentCustomer,
        travelExpensesCents: offer.travelExpensesCents,
        menuPriceCents: offer.menuPriceCents,
        paymentProviderFeeCents: offer.paymentProviderFeeCents,
        platformFeeCentsCook: offer.platformFeeCentsCook,
        platformFeeCentsCustomer: offer.platformFeeCentsCustomer,
        payoutCentsCook: offer.payoutCentsCook,
        totalWithoutDiscountsCentsCustomer: offer.totalWithoutDiscountsCentsCustomer,
    };
}
