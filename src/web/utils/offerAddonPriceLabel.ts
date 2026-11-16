import { t } from '../../i18n/t';
import { formatCurrency } from '../../shared';
import type { Locale } from './locale';

export type OfferAddonPricingUnit = 'FLAT' | 'PER_PERSON';

export function offerAddonPricingUnitLabel(pricingUnit: OfferAddonPricingUnit, locale: Locale): string {
    if (pricingUnit === 'PER_PERSON') {
        return t(locale, 'common', 'm.perPerson');
    }
    return t(locale, 'common', 'm.flat');
}

export function offerAddonPriceLabel(priceCents: number, pricingUnit: OfferAddonPricingUnit, locale: Locale): string {
    const amount = formatCurrency(priceCents, { locale });
    if (pricingUnit === 'PER_PERSON') {
        return t(locale, 'common', 'm.perPerson2', { amount: amount });
    }
    return t(locale, 'common', 'm.flat2', { amount: amount });
}

export function offerAddonPricingUnitHelp(locale: Locale): string {
    return t(locale, 'common', 'm.flatOnePriceForTheWholeEvent');
}

export function offerAddonPriceFieldHelp(pricingUnit: OfferAddonPricingUnit, locale: Locale): string {
    if (pricingUnit === 'PER_PERSON') {
        return t(locale, 'common', 'm.thisAmountAppliesPerPayingGuest');
    }
    return t(locale, 'common', 'm.thisAmountIsAddedToTheOffer');
}
