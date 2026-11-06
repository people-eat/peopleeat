import { formatCurrency } from '../../shared';
import type { Locale } from './locale';

export type OfferAddonPricingUnit = 'FLAT' | 'PER_PERSON';

export function offerAddonPricingUnitLabel(pricingUnit: OfferAddonPricingUnit, locale: Locale): string {
    if (pricingUnit === 'PER_PERSON') {
        return { de: 'Pro Person', en: 'Per person' }[locale];
    }
    return { de: 'Pauschal', en: 'Flat' }[locale];
}

export function offerAddonPriceLabel(priceCents: number, pricingUnit: OfferAddonPricingUnit, locale: Locale): string {
    const amount = formatCurrency(priceCents, { locale });
    if (pricingUnit === 'PER_PERSON') {
        return { de: `${amount} pro Person`, en: `${amount} per person` }[locale];
    }
    return { de: `${amount} pauschal`, en: `${amount} flat` }[locale];
}

export function offerAddonPricingUnitHelp(locale: Locale): string {
    return {
        de: 'Pauschal: ein Preis für das ganze Event, unabhängig von der Gästezahl. Pro Person: der Preis wird mit den zahlenden Gästen multipliziert. Ermäßigte Gäste zählen halb.',
        en: 'Flat: one price for the whole event, regardless of guest count. Per person: the price is multiplied by paying guests. Discounted guests count as half.',
    }[locale];
}

export function offerAddonPriceFieldHelp(pricingUnit: OfferAddonPricingUnit, locale: Locale): string {
    if (pricingUnit === 'PER_PERSON') {
        return {
            de: 'Dieser Betrag gilt je zahlender Person.',
            en: 'This amount applies per paying guest.',
        }[locale];
    }
    return {
        de: 'Dieser Betrag kommt einmal zum Angebot dazu.',
        en: 'This amount is added to the offer once.',
    }[locale];
}
