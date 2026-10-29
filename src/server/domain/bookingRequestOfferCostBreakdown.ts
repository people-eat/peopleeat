import type { Locale } from '../../shared/locale';

export type CostLineItem = {
    title: string;
    /** Integer cents. Discounts are negative. */
    amountCents: number;
    subLineItems?: CostLineItem[] | null;
};

export type CostBreakdown = {
    lineItems: CostLineItem[];
    total: CostLineItem | null;
    totalPerPerson: CostLineItem | null;
    totalBeforeDiscount: CostLineItem | null;
};

export type BookingRequestOfferCostBreakdownBuildInput = {
    locale: Locale;
    menuPriceCents: number;
    travelExpensesCents: number;
    platformFeeCentsCustomer: number;
    paymentProviderFeeCents: number;
    totalWithoutDiscountsCentsCustomer: number;
    /** Optional override after discounts; otherwise computed from discounts. */
    totalCentsCustomer?: number | null;
    participantCount?: number | null;
    promoCode?: { redeemCode: string; amountCents: number } | null;
    /** Applied or preview gift amount (not necessarily the card's remaining balance). */
    giftCard?: { redeemCode: string; amountCents: number } | null;
};

/**
 * Customer-facing cost tree for an offer. Titles are bilingual at the call site
 * via `locale`. Amounts are integer cents (discounts negative).
 */
export function bookingRequestOfferCostBreakdownBuild(input: BookingRequestOfferCostBreakdownBuildInput): CostBreakdown {
    const promoCents = input.promoCode?.amountCents ?? 0;
    const giftCents = input.giftCard?.amountCents ?? 0;
    const discountCents = promoCents + giftCents;
    const computedTotal = Math.max(0, input.totalWithoutDiscountsCentsCustomer - discountCents);
    const totalCents = input.totalCentsCustomer ?? computedTotal;

    const lineItems: CostLineItem[] = [
        {
            title: { de: 'Menüpreis', en: 'Menu price' }[input.locale],
            amountCents: input.menuPriceCents + input.travelExpensesCents,
        },
        {
            title: { de: 'Servicegebühren', en: 'Service fees' }[input.locale],
            amountCents: input.platformFeeCentsCustomer + input.paymentProviderFeeCents,
        },
    ];

    if (input.promoCode && promoCents > 0) {
        lineItems.push({
            title: `${{ de: 'Promocode', en: 'Promo code' }[input.locale]} ${input.promoCode.redeemCode}`,
            amountCents: -promoCents,
        });
    }

    if (input.giftCard && giftCents > 0) {
        lineItems.push({
            title: `${{ de: 'Gutschein', en: 'Voucher' }[input.locale]} ${input.giftCard.redeemCode}`,
            amountCents: -giftCents,
        });
    }

    const participantCount = input.participantCount;
    const totalPerPerson =
        participantCount != null && participantCount > 0
            ? {
                  title: { de: 'Pro Person', en: 'Per person' }[input.locale],
                  amountCents: Math.round(totalCents / participantCount),
              }
            : null;

    return {
        lineItems,
        totalBeforeDiscount:
            discountCents > 0
                ? {
                      title: { de: 'Vorher', en: 'Before' }[input.locale],
                      amountCents: input.totalWithoutDiscountsCentsCustomer,
                  }
                : null,
        total: {
            title: { de: 'Gesamtpreis', en: 'Total price' }[input.locale],
            amountCents: totalCents,
        },
        totalPerPerson,
    };
}
