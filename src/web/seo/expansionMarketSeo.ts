import { t } from '../../i18n/t';
import type { ExpansionMarket } from '../../shared/expansionMarkets';
import {
    expansionMarketCityNames,
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

function expansionMarketJsonLdCities(market: ExpansionMarket, locale: Locale) {
    const names = expansionMarketCityNames(market, locale);
    return market.cities.map((city, index) => ({
        name: names[index] ?? city.key,
        latitude: city.latitude,
        longitude: city.longitude,
    }));
}

export function expansionMarketComingToHead(market: ExpansionMarket, locale: Locale) {
    const webPageUrl = webPageUrlGet();
    const path = market.comingToPath;
    const title = expansionMarketComingToTitle(market, locale);
    const description = expansionMarketComingToDescription(market, locale);
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
                cities: expansionMarketJsonLdCities(market, locale),
            }),
            jsonLdFaqPage(expansionMarketFaqEntries(market, 'comingTo', locale)),
        ]),
    };
}

export function expansionMarketFoundingChefHead(market: ExpansionMarket, locale: Locale) {
    const webPageUrl = webPageUrlGet();
    const path = market.foundingChefPath;
    const title = expansionMarketFoundingChefTitle(market, locale);
    const description = expansionMarketFoundingChefDescription(market, locale);
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
                cities: expansionMarketJsonLdCities(market, locale),
            }),
            jsonLdFaqPage(expansionMarketFaqEntries(market, 'foundingChef', locale)),
        ]),
    };
}

function expansionMarketCountryName(market: ExpansionMarket, locale: Locale): string {
    if (locale === 'de') return market.nameDe;
    if (locale === 'en') return market.nameEn;
    return t(locale, 'public', `cityCountry.${market.countryCode}`);
}
