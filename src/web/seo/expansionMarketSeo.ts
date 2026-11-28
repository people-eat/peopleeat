import { t } from '../../i18n/t';
import { contentLocaleText } from '../../shared/contentSection';
import type { ExpansionMarket } from '../../shared/expansionMarkets';
import {
    expansionMarketCityNames,
    expansionMarketCityNamesJoin,
    expansionMarketComingToDescription,
    expansionMarketComingToTitle,
    expansionMarketFaqEntries,
    expansionMarketFoundingChefDescription,
    expansionMarketFoundingChefTitle,
} from '../../shared/expansionMarkets';
import type { Locale } from '../../shared/locale';
import { jsonLdBreadcrumbList, jsonLdCountryService, jsonLdFaqPage, jsonLdHeadScripts } from './jsonLd';
import { SITE_NAME } from './seoConstants';
import { seoMeta } from './seoMeta';
import { webPageUrlGet } from './webPageUrlGet';

export type ExpansionMarketSeoCity = {
    nameDe: string;
    nameEn: string;
    nameNl?: string;
    latitude: number;
    longitude: number;
};

function expansionMarketJsonLdCities(market: ExpansionMarket, locale: Locale, cities: readonly ExpansionMarketSeoCity[]) {
    if (cities.length > 0) {
        return cities.map((city) => ({
            name: contentLocaleText(city.nameDe, city.nameEn, locale, city.nameNl),
            latitude: city.latitude,
            longitude: city.longitude,
        }));
    }
    const names = expansionMarketCityNames(market, locale);
    return market.cities.map((city, index) => ({
        name: names[index] ?? city.key,
        latitude: city.latitude,
        longitude: city.longitude,
    }));
}

function expansionMarketCitiesOverride(cities: readonly ExpansionMarketSeoCity[], locale: Locale): string | undefined {
    if (cities.length === 0) return undefined;
    return expansionMarketCityNamesJoin(
        cities.map((city) => contentLocaleText(city.nameDe, city.nameEn, locale, city.nameNl)),
        locale,
    );
}

export function expansionMarketComingToHead(market: ExpansionMarket, locale: Locale, cities: readonly ExpansionMarketSeoCity[] = []) {
    const webPageUrl = webPageUrlGet();
    const path = market.comingToPath;
    const citiesOverride = expansionMarketCitiesOverride(cities, locale);
    const title = expansionMarketComingToTitle(market, locale, citiesOverride);
    const description = expansionMarketComingToDescription(market, locale, citiesOverride);
    return {
        ...seoMeta({ title, description, path, locale, webPageUrl }),
        scripts: jsonLdHeadScripts([
            jsonLdBreadcrumbList(webPageUrl, locale, [
                { name: SITE_NAME, path: '/' },
                { name: title, path },
            ]),
            jsonLdCountryService({
                webPageUrl,
                locale,
                path,
                name: title,
                description,
                countryName: expansionMarketCountryName(market, locale),
                cities: expansionMarketJsonLdCities(market, locale, cities),
            }),
            jsonLdFaqPage(expansionMarketFaqEntries(market, 'comingTo', locale, citiesOverride)),
        ]),
    };
}

export function expansionMarketFoundingChefHead(market: ExpansionMarket, locale: Locale, cities: readonly ExpansionMarketSeoCity[] = []) {
    const webPageUrl = webPageUrlGet();
    const path = market.foundingChefPath;
    const citiesOverride = expansionMarketCitiesOverride(cities, locale);
    const title = expansionMarketFoundingChefTitle(market, locale, citiesOverride);
    const description = expansionMarketFoundingChefDescription(market, locale, citiesOverride);
    return {
        ...seoMeta({ title, description, path, locale, webPageUrl }),
        scripts: jsonLdHeadScripts([
            jsonLdBreadcrumbList(webPageUrl, locale, [
                { name: SITE_NAME, path: '/' },
                { name: t(locale, 'public', 'howToBecome.breadcrumb'), path: '/how-to-become-a-chef' },
                { name: title, path },
            ]),
            jsonLdCountryService({
                webPageUrl,
                locale,
                path,
                name: title,
                description,
                countryName: expansionMarketCountryName(market, locale),
                cities: expansionMarketJsonLdCities(market, locale, cities),
            }),
            jsonLdFaqPage(expansionMarketFaqEntries(market, 'foundingChef', locale, citiesOverride)),
        ]),
    };
}

function expansionMarketCountryName(market: ExpansionMarket, locale: Locale): string {
    if (locale === 'de') return market.nameDe;
    if (locale === 'en') return market.nameEn;
    return t(locale, 'public', `cityCountry.${market.countryCode}`);
}
