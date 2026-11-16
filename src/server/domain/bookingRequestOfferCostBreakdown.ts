import { t } from '../../i18n/t';
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

type BookingRequestOfferCostBreakdownAddonLine = {
    title: string;
    amountCents: number;
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
    /** Selected offer addons — each becomes a cost line (or Extras parent with children). */
    selectedAddons?: BookingRequestOfferCostBreakdownAddonLine[] | null;
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
            title: t(input.locale, 'common', 'costBreakdown.menuPrice'),
            amountCents: input.menuPriceCents + input.travelExpensesCents,
        },
    ];

    const selectedAddons = (input.selectedAddons ?? []).filter((addon) => addon.amountCents > 0);
    if (selectedAddons.length === 1) {
        lineItems.push({
            title: selectedAddons[0]!.title,
            amountCents: selectedAddons[0]!.amountCents,
        });
    } else if (selectedAddons.length > 1) {
        lineItems.push({
            title: t(input.locale, 'common', 'costBreakdown.extras'),
            amountCents: selectedAddons.reduce((sum, addon) => sum + addon.amountCents, 0),
            subLineItems: selectedAddons.map((addon) => ({
                title: addon.title,
                amountCents: addon.amountCents,
            })),
        });
    }

    lineItems.push({
        title: t(input.locale, 'common', 'costBreakdown.serviceFees'),
        amountCents: input.platformFeeCentsCustomer + input.paymentProviderFeeCents,
    });

    if (input.promoCode && promoCents > 0) {
        lineItems.push({
            title: t(input.locale, 'common', 'costBreakdown.promoCode', { code: input.promoCode.redeemCode }),
            amountCents: -promoCents,
        });
    }

    if (input.giftCard && giftCents > 0) {
        lineItems.push({
            title: t(input.locale, 'common', 'costBreakdown.voucher', { code: input.giftCard.redeemCode }),
            amountCents: -giftCents,
        });
    }

    const participantCount = input.participantCount;
    const totalPerPerson =
        participantCount != null && participantCount > 0
            ? {
                  title: t(input.locale, 'common', 'costBreakdown.perPerson'),
                  amountCents: Math.round(totalCents / participantCount),
              }
            : null;

    return {
        lineItems,
        totalBeforeDiscount:
            discountCents > 0
                ? {
                      title: t(input.locale, 'common', 'costBreakdown.before'),
                      amountCents: input.totalWithoutDiscountsCentsCustomer,
                  }
                : null,
        total: {
            title: t(input.locale, 'common', 'costBreakdown.totalPrice'),
            amountCents: totalCents,
        },
        totalPerPerson,
    };
}
