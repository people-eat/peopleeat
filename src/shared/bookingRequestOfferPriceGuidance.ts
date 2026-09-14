/**
 * Soft price-class guidance for cook/admin offer pricing (integer cents per person).
 * Soft min/max are UX-only; `minOfferAmountHardCents` is a customer-total floor from promo codes.
 * See docs/architecture/booking.md and predecessor `toCookBookingRequest`.
 */

export type BookingRequestOfferPriceClassType = 'LOW' | 'MEDIUM' | 'HIGH';

export type BookingRequestOfferPriceGuidanceInput = {
    priceClassType: BookingRequestOfferPriceClassType | null | undefined;
    participantsAdult: number;
    participantsDiscounted: number;
    estimatedTravelExpensesCents: number;
    promoMinimumTotalAmountCustomerCents?: number | null;
};

export type BookingRequestOfferPriceGuidanceResult = {
    suggestedOfferAmountCents: number;
    minOfferAmountCents: number | null;
    maxOfferAmountCents: number | null;
    minOfferAmountHardCents: number | null;
};

const PRICE_CLASS_RANGES: Record<BookingRequestOfferPriceClassType, { min: number; max: number }> = {
    LOW: { min: 7500, max: 9500 },
    MEDIUM: { min: 9500, max: 10500 },
    HIGH: { min: 10500, max: 15500 },
};

const PRICE_CLASS_RANGES_TEN_PLUS_ADULTS: Record<BookingRequestOfferPriceClassType, { min: number; max: number }> = {
    LOW: { min: 6400, max: 7200 },
    MEDIUM: { min: 8100, max: 8900 },
    HIGH: { min: 8900, max: 13200 },
};

const CUSTOMER_PLATFORM_FEE_FRACTION = 0.04;
const GROSS_UP_FACTOR = 0.98;
const PLATFORM_MIN_SPEND_TOTAL_CENTS = 35_000;

function roundCents(amount: number): number {
    return Math.round(amount);
}

export function bookingRequestPaidParticipants(participantsAdult: number, participantsDiscounted: number): number {
    return participantsAdult + participantsDiscounted * 0.5;
}

export function bookingRequestOfferPriceGuidance(input: BookingRequestOfferPriceGuidanceInput): BookingRequestOfferPriceGuidanceResult {
    const priceClassType = input.priceClassType ?? 'MEDIUM';
    const ranges = input.participantsAdult >= 10 ? PRICE_CLASS_RANGES_TEN_PLUS_ADULTS : PRICE_CLASS_RANGES;
    const { min, max } = ranges[priceClassType];

    const paidParticipants = bookingRequestPaidParticipants(input.participantsAdult, input.participantsDiscounted);
    const travelPerPerson = paidParticipants > 0 ? input.estimatedTravelExpensesCents / paidParticipants : 0;

    const lowerBoundary = (min - travelPerPerson) * GROSS_UP_FACTOR * (1 - CUSTOMER_PLATFORM_FEE_FRACTION);
    const upperBoundary = (max - travelPerPerson) * GROSS_UP_FACTOR * (1 - CUSTOMER_PLATFORM_FEE_FRACTION);

    const minSpendTotalAmount = input.promoMinimumTotalAmountCustomerCents ?? PLATFORM_MIN_SPEND_TOTAL_CENTS;
    const headcountForMinSpend = input.participantsAdult + input.participantsDiscounted;

    const minMaxBasedSuggestion = Math.round((upperBoundary + lowerBoundary) / (2 * 100)) * 100;
    let suggestion = minMaxBasedSuggestion;
    let disableUpperBoundary = false;

    if (headcountForMinSpend > 0 && minSpendTotalAmount / headcountForMinSpend > minMaxBasedSuggestion) {
        disableUpperBoundary = true;
        suggestion = Math.round(minSpendTotalAmount / (headcountForMinSpend * 100)) * 100;
    }

    let minOfferAmountCents: number | null = Math.max(0, lowerBoundary > suggestion ? suggestion : lowerBoundary);
    let maxOfferAmountCents: number | null = disableUpperBoundary ? suggestion * 1.2 : upperBoundary;

    const minOfferAmountHardCents = input.promoMinimumTotalAmountCustomerCents ?? null;

    if (input.promoMinimumTotalAmountCustomerCents != null) {
        minOfferAmountCents = null;
        maxOfferAmountCents = null;
    }

    return {
        suggestedOfferAmountCents: roundCents(suggestion),
        minOfferAmountCents: minOfferAmountCents == null ? null : roundCents(minOfferAmountCents),
        maxOfferAmountCents: maxOfferAmountCents == null ? null : roundCents(maxOfferAmountCents),
        minOfferAmountHardCents,
    };
}
