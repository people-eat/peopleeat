import { t } from '../i18n/t';
import type { Locale } from './locale';
import { toStripeCountryCode } from './toStripeCountryCode';

const expansionMarketSlugs = ['netherlands', 'switzerland'] as const;
export type ExpansionMarketSlug = (typeof expansionMarketSlugs)[number];

export const BOOKING_REQUEST_MARKET_CLOSED_ERROR = 'bookingRequestMarketClosed';

type NetherlandsCityKey = 'amsterdam' | 'rotterdam' | 'theHague' | 'utrecht' | 'eindhoven';
type SwitzerlandCityKey = 'zurich' | 'geneva' | 'basel' | 'bern' | 'lausanne';
type ExpansionMarketCityKey = NetherlandsCityKey | SwitzerlandCityKey;

type ExpansionMarketCity = {
    key: ExpansionMarketCityKey;
    latitude: number;
    longitude: number;
};

export type ExpansionMarket = {
    slug: ExpansionMarketSlug;
    countryCode: 'NL' | 'CH';
    nameDe: string;
    nameEn: string;
    flagSrc: string;
    flagMarkSrc: string;
    comingToPath: string;
    foundingChefPath: string;
    cities: readonly ExpansionMarketCity[];
};

type ExpansionMarketFaqKind = 'comingTo' | 'foundingChef';

const comingToFaqKeys = ['canBook', 'registerNow', 'whichCities', 'sendAnyway'] as const;
const foundingChefFaqKeys = ['requestsNow', 'whyEarly', 'whichCities', 'priceBenefit'] as const;

const netherlandsCities = [
    { key: 'amsterdam', latitude: 52.3676, longitude: 4.9041 },
    { key: 'rotterdam', latitude: 51.9244, longitude: 4.4777 },
    { key: 'theHague', latitude: 52.0705, longitude: 4.3007 },
    { key: 'utrecht', latitude: 52.0907, longitude: 5.1214 },
    { key: 'eindhoven', latitude: 51.4416, longitude: 5.4697 },
] as const satisfies readonly ExpansionMarketCity[];

const switzerlandCities = [
    { key: 'zurich', latitude: 47.3769, longitude: 8.5417 },
    { key: 'geneva', latitude: 46.2044, longitude: 6.1432 },
    { key: 'basel', latitude: 47.5596, longitude: 7.5886 },
    { key: 'bern', latitude: 46.948, longitude: 7.4474 },
    { key: 'lausanne', latitude: 46.5197, longitude: 6.6323 },
] as const satisfies readonly ExpansionMarketCity[];

function cityName(city: ExpansionMarketCity, market: ExpansionMarket, locale: Locale): string {
    return t(locale, 'public', `comingTo.markets.${market.slug}.city.${city.key}`);
}

function cityList(cities: readonly ExpansionMarketCity[], market: ExpansionMarket, locale: Locale): string {
    const names = cities.map((city) => cityName(city, market, locale));
    if (names.length === 0) return '';
    if (names.length === 1) return names[0] ?? '';
    const last = names.at(-1) ?? '';
    const head = names.slice(0, -1).join(', ');
    return t(locale, 'public', 'comingTo.cityListJoin', { head, last });
}

function marketPhrases(market: ExpansionMarket, locale: Locale): { comingTo: string; inCountry: string; cities: string } {
    return {
        comingTo: t(locale, 'public', `comingTo.markets.${market.slug}.comingTo`),
        inCountry: t(locale, 'public', `comingTo.markets.${market.slug}.inCountry`),
        cities: cityList(market.cities, market, locale),
    };
}

const netherlands: ExpansionMarket = {
    slug: 'netherlands',
    countryCode: 'NL',
    nameDe: 'Niederlande',
    nameEn: 'the Netherlands',
    flagSrc: '/countries/flag-netherlands.png',
    flagMarkSrc: '/countries/flag-netherlands-peopleeat.png',
    comingToPath: '/coming-to/netherlands',
    foundingChefPath: '/how-to-become-a-chef/netherlands',
    cities: netherlandsCities,
};

const switzerland: ExpansionMarket = {
    slug: 'switzerland',
    countryCode: 'CH',
    nameDe: 'Schweiz',
    nameEn: 'Switzerland',
    flagSrc: '/countries/flag-switzerland.png',
    flagMarkSrc: '/countries/flag-switzerland-peopleeat.png',
    comingToPath: '/coming-to/switzerland',
    foundingChefPath: '/how-to-become-a-chef/switzerland',
    cities: switzerlandCities,
};

const expansionMarkets: Record<ExpansionMarketSlug, ExpansionMarket> = {
    netherlands,
    switzerland,
};

export const expansionMarketList: readonly ExpansionMarket[] = expansionMarketSlugs.map((slug) => expansionMarkets[slug]);

export function expansionMarketFromParam(value: string | undefined | null): ExpansionMarket | null {
    if (value === 'netherlands' || value === 'switzerland') {
        return expansionMarkets[value];
    }
    return null;
}

export function expansionMarketFromCountry(country: string | null | undefined): ExpansionMarket | null {
    const code = toStripeCountryCode(country ?? '');
    if (code === 'NL') return expansionMarkets.netherlands;
    if (code === 'CH') return expansionMarkets.switzerland;
    return null;
}

export function expansionMarketInCountryPhrase(market: ExpansionMarket, locale: Locale): string {
    return marketPhrases(market, locale).inCountry;
}

export function expansionMarketComingToPhrase(market: ExpansionMarket, locale: Locale): string {
    return marketPhrases(market, locale).comingTo;
}

export function expansionMarketCityList(market: ExpansionMarket, locale: Locale): string {
    return cityList(market.cities, market, locale);
}

export function expansionMarketCityNames(market: ExpansionMarket, locale: Locale): readonly string[] {
    return market.cities.map((city) => cityName(city, market, locale));
}

export function expansionMarketComingToTitle(market: ExpansionMarket, locale: Locale): string {
    return t(locale, 'public', 'comingTo.pageTitle', marketPhrases(market, locale));
}

export function expansionMarketComingToDescription(market: ExpansionMarket, locale: Locale): string {
    return t(locale, 'public', 'comingTo.pageDescription', marketPhrases(market, locale));
}

export function expansionMarketFoundingChefTitle(market: ExpansionMarket, locale: Locale): string {
    return t(locale, 'public', 'comingTo.foundingTitle', marketPhrases(market, locale));
}

export function expansionMarketFoundingChefDescription(market: ExpansionMarket, locale: Locale): string {
    return t(locale, 'public', 'comingTo.foundingDescription', marketPhrases(market, locale));
}

export function expansionMarketFaqEntries(
    market: ExpansionMarket,
    kind: ExpansionMarketFaqKind,
    locale: Locale,
): ReadonlyArray<{ question: string; answer: string }> {
    const phrases = marketPhrases(market, locale);
    const keys = kind === 'comingTo' ? comingToFaqKeys : foundingChefFaqKeys;
    const prefix = kind === 'comingTo' ? 'comingTo.faq' : 'comingTo.foundingFaq';
    return keys.map((key) => ({
        question: t(locale, 'public', `${prefix}.${key}.question`, phrases),
        answer: t(locale, 'public', `${prefix}.${key}.answer`, phrases),
    }));
}

export function placesRegionCodeNormalize(value: string | null | undefined): string {
    const trimmed = value?.trim() ?? '';
    if (/^[A-Za-z]{2}$/.test(trimmed)) {
        return trimmed.toUpperCase();
    }
    return 'DE';
}

export function bookingRequestMarketClosedAssert(country: string, errorPrefix: string): void {
    const market = expansionMarketFromCountry(country);
    if (!market) return;
    throw new Error(`${errorPrefix}: ${BOOKING_REQUEST_MARKET_CLOSED_ERROR}:${market.slug}`);
}

export function bookingRequestMarketClosedFromMessage(message: string | undefined | null): ExpansionMarket | null {
    if (!message) return null;
    const match = message.match(new RegExp(`${BOOKING_REQUEST_MARKET_CLOSED_ERROR}:(netherlands|switzerland)`));
    const slug = match?.[1];
    return expansionMarketFromParam(slug);
}
