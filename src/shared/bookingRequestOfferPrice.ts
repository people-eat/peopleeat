/**
 * Booking-request offer fee breakdown (integer cents).
 * Platform: 18% cook / 4% customer on menu price. Stripe-style gross-up:
 * (menu + customer fee + travel + 25¢) / (1 − 1.5%).
 * See docs/features/booking-payment.md and docs/features/booking-offers.md.
 */

export type BookingRequestOfferPriceInput = {
    menuPriceCents: number;
    travelExpensesCents: number;
};

export type BookingRequestOfferPriceResult = {
    platformFeePercentCook: number;
    platformFeePercentCustomer: number;
    menuPriceCents: number;
    travelExpensesCents: number;
    paymentProviderFeeCents: number;
    platformFeeCentsCook: number;
    platformFeeCentsCustomer: number;
    payoutCentsCook: number;
    totalWithoutDiscountsCentsCustomer: number;
};

const BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK = 18;
const BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER = 4;
const BOOKING_REQUEST_OFFER_PAYMENT_PROVIDER_FIXED_CENTS = 25;
const BOOKING_REQUEST_OFFER_PAYMENT_PROVIDER_PERCENT = 1.5;

function roundCents(amount: number): number {
    return Math.round(amount);
}

export function bookingRequestOfferPriceCalculate(input: BookingRequestOfferPriceInput): BookingRequestOfferPriceResult {
    const menuPriceCents = roundCents(input.menuPriceCents);
    const travelExpensesCents = roundCents(input.travelExpensesCents);

    const platformFeeCentsCook = roundCents(menuPriceCents * (BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK / 100));
    const platformFeeCentsCustomer = roundCents(menuPriceCents * (BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER / 100));
    const payoutCentsCook = roundCents(menuPriceCents - platformFeeCentsCook + travelExpensesCents);
    const totalWithoutDiscountsCentsCustomer = roundCents(
        (menuPriceCents + platformFeeCentsCustomer + travelExpensesCents + BOOKING_REQUEST_OFFER_PAYMENT_PROVIDER_FIXED_CENTS) /
            (1 - BOOKING_REQUEST_OFFER_PAYMENT_PROVIDER_PERCENT / 100),
    );
    const paymentProviderFeeCents = roundCents(
        totalWithoutDiscountsCentsCustomer - (menuPriceCents + platformFeeCentsCustomer + travelExpensesCents),
    );

    return {
        platformFeePercentCook: BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK,
        platformFeePercentCustomer: BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER,
        menuPriceCents,
        travelExpensesCents,
        paymentProviderFeeCents,
        platformFeeCentsCook,
        platformFeeCentsCustomer,
        payoutCentsCook,
        totalWithoutDiscountsCentsCustomer,
    };
}

/** Cook payout if the cook priced at the soft suggested per-person amount. */
export function bookingRequestSuggestedCookPayoutCents(input: {
    suggestedOfferAmountCents: number;
    participantsAdult: number;
    participantsDiscounted: number;
    estimatedTravelExpensesCents: number;
}): number {
    // Same paid-headcount rule as bookingRequestPaidParticipants (kids at half).
    const paidParticipants = input.participantsAdult + input.participantsDiscounted * 0.5;
    const menuPriceCents = roundCents(input.suggestedOfferAmountCents * paidParticipants);
    return bookingRequestOfferPriceCalculate({
        menuPriceCents,
        travelExpensesCents: input.estimatedTravelExpensesCents,
    }).payoutCentsCook;
}
