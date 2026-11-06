/**
 * Booking-request offer fee breakdown (integer cents).
 * Platform: default 18% cook / 4% customer on fee base (menu + selected addons).
 * Travel stays pass-through (no platform fee).
 * Stripe-style gross-up: (feeBase + customer fee + travel + 25¢) / (1 - 1.5%).
 * See docs/features/booking-payment.md, docs/features/booking-offers.md, and
 * docs/features/booking-offer-addons.md.
 */

export type BookingRequestOfferPriceInput = {
    menuPriceCents: number;
    travelExpensesCents: number;
    /** Sum of selected addon totals at current paid headcount. Defaults to 0. */
    addonPriceCents?: number;
    /** When omitted, defaults to {@link BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK}. */
    platformFeePercentCook?: number;
    /** When omitted, defaults to {@link BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER}. */
    platformFeePercentCustomer?: number;
};

export type BookingRequestOfferPriceResult = {
    platformFeePercentCook: number;
    platformFeePercentCustomer: number;
    menuPriceCents: number;
    addonPriceCents: number;
    travelExpensesCents: number;
    paymentProviderFeeCents: number;
    platformFeeCentsCook: number;
    platformFeeCentsCustomer: number;
    payoutCentsCook: number;
    totalWithoutDiscountsCentsCustomer: number;
};

export type BookingRequestOfferAddonPriceLine = {
    pricingUnit: 'FLAT' | 'PER_PERSON';
    priceCents: number;
    /** When false / omitted, the line contributes 0. */
    selected?: boolean;
};

export const BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK = 18;
export const BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER = 4;
const BOOKING_REQUEST_OFFER_PAYMENT_PROVIDER_FIXED_CENTS = 25;
const BOOKING_REQUEST_OFFER_PAYMENT_PROVIDER_PERCENT = 1.5;

function roundCents(amount: number): number {
    return Math.round(amount);
}

function platformFeePercentResolve(value: number | undefined, fallback: number): number {
    if (value === undefined) {
        return fallback;
    }
    if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw new Error('bookingRequestOfferPriceCalculate: platform fee percent must be an integer from 0 to 100');
    }
    return value;
}

/**
 * Sum selected addon unit prices into a fee-base contribution.
 * FLAT → priceCents; PER_PERSON → round(priceCents × paidParticipants).
 */
export function bookingRequestOfferAddonPriceCentsCalculate(
    addons: readonly BookingRequestOfferAddonPriceLine[],
    paidParticipants: number,
): number {
    if (paidParticipants < 0) {
        throw new Error('bookingRequestOfferAddonPriceCentsCalculate: paidParticipants must be non-negative');
    }
    let total = 0;
    for (const addon of addons) {
        if (addon.selected === false) {
            continue;
        }
        if (!Number.isInteger(addon.priceCents) || addon.priceCents < 0) {
            throw new Error('bookingRequestOfferAddonPriceCentsCalculate: priceCents must be a non-negative integer');
        }
        if (addon.pricingUnit === 'FLAT') {
            total += addon.priceCents;
            continue;
        }
        total += roundCents(addon.priceCents * paidParticipants);
    }
    return total;
}

export function bookingRequestOfferPriceCalculate(input: BookingRequestOfferPriceInput): BookingRequestOfferPriceResult {
    const menuPriceCents = roundCents(input.menuPriceCents);
    const addonPriceCents = roundCents(input.addonPriceCents ?? 0);
    const travelExpensesCents = roundCents(input.travelExpensesCents);
    const platformFeePercentCook = platformFeePercentResolve(input.platformFeePercentCook, BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK);
    const platformFeePercentCustomer = platformFeePercentResolve(
        input.platformFeePercentCustomer,
        BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER,
    );

    const feeBaseCents = menuPriceCents + addonPriceCents;
    const platformFeeCentsCook = roundCents(feeBaseCents * (platformFeePercentCook / 100));
    const platformFeeCentsCustomer = roundCents(feeBaseCents * (platformFeePercentCustomer / 100));
    const payoutCentsCook = roundCents(feeBaseCents - platformFeeCentsCook + travelExpensesCents);
    const totalWithoutDiscountsCentsCustomer = roundCents(
        (feeBaseCents + platformFeeCentsCustomer + travelExpensesCents + BOOKING_REQUEST_OFFER_PAYMENT_PROVIDER_FIXED_CENTS) /
            (1 - BOOKING_REQUEST_OFFER_PAYMENT_PROVIDER_PERCENT / 100),
    );
    const paymentProviderFeeCents = roundCents(
        totalWithoutDiscountsCentsCustomer - (feeBaseCents + platformFeeCentsCustomer + travelExpensesCents),
    );

    return {
        platformFeePercentCook,
        platformFeePercentCustomer,
        menuPriceCents,
        addonPriceCents,
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

/**
 * Scale a locked menu total by paid-headcount ratio (adults + 0.5 × children).
 * Used for pre-accept customer headcount edits and post-accept amendments.
 * Flat addons are NOT scaled here — recompute via {@link bookingRequestOfferAddonPriceCentsCalculate}.
 */
export function bookingRequestOfferMenuPriceScaleByPaidParticipants(input: {
    menuPriceCents: number;
    paidParticipantsBefore: number;
    paidParticipantsAfter: number;
}): number {
    if (input.paidParticipantsBefore <= 0) {
        throw new Error('bookingRequestOfferMenuPriceScaleByPaidParticipants: paidParticipantsBefore must be positive');
    }
    if (input.paidParticipantsAfter <= 0) {
        throw new Error('bookingRequestOfferMenuPriceScaleByPaidParticipants: paidParticipantsAfter must be positive');
    }
    return roundCents((input.menuPriceCents * input.paidParticipantsAfter) / input.paidParticipantsBefore);
}
