import type { Locale } from './locale';

/** Markets that can own a public city landing page. */
export const cityCountryCodes = ['DE', 'NL', 'CH'] as const;
export type CityCountryCode = (typeof cityCountryCodes)[number];

/** Stable display order for `/cities` grouping and homepage chrome. */
export const cityCountryCodeOrder: readonly CityCountryCode[] = ['DE', 'NL', 'CH'];

const cityCountryCodeSet = new Set<string>(cityCountryCodes);

export function isCityCountryCode(value: string): value is CityCountryCode {
    return cityCountryCodeSet.has(value);
}

export function cityCountryCodeAssert(value: string, errorPrefix: string): CityCountryCode {
    const trimmed = value.trim().toUpperCase();
    if (!isCityCountryCode(trimmed)) {
        throw new Error(`${errorPrefix}: invalid city country code`);
    }
    return trimmed;
}

export function cityCountryCodeLabel(countryCode: CityCountryCode, locale: Locale): string {
    return (
        {
            DE: { de: 'Deutschland', en: 'Germany' },
            NL: { de: 'Niederlande', en: 'the Netherlands' },
            CH: { de: 'Schweiz', en: 'Switzerland' },
        } as const
    )[countryCode][locale];
}

/** Public hub for country-intent SEO. DE uses the cities catalog; NL/CH use coming-to until guest launch. */
export function cityCountryHubPath(countryCode: CityCountryCode): string {
    if (countryCode === 'NL') return '/coming-to/netherlands';
    if (countryCode === 'CH') return '/coming-to/switzerland';
    return '/cities';
}

export function cityCountryHubLinkLabel(countryCode: CityCountryCode, locale: Locale): string {
    if (countryCode === 'DE') {
        return { de: 'Alle Städte', en: 'All cities' }[locale];
    }
    return cityCountryCodeLabel(countryCode, locale);
}

/** Section heading for same-country sibling city lists. */
export function cityCountryCitiesHeading(countryCode: CityCountryCode, locale: Locale): string {
    return (
        {
            DE: { de: 'Unsere Städte', en: 'Our cities' },
            NL: { de: 'Städte in den Niederlanden', en: 'Cities in the Netherlands' },
            CH: { de: 'Städte in der Schweiz', en: 'Cities in Switzerland' },
        } as const
    )[countryCode][locale];
}
