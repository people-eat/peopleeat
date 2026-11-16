import { t } from '../../i18n/t';
import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { expansionMarketFaqEntries } from '../../shared/expansionMarkets';
import { inlineCopy } from '../../shared/locale';
import type { Locale } from '../../shared/locale';
import { jsonLdBreadcrumbList, jsonLdCountryService, jsonLdFaqPage, jsonLdHeadScripts } from './jsonLd';
import { SITE_NAME } from './seoConstants';
import { seoMeta } from './seoMeta';
import { webPageUrlGet } from './webPageUrlGet';

export function expansionMarketComingToHead(market: ExpansionMarket, locale: Locale) {
    const webPageUrl = webPageUrlGet();
    const path = market.comingToPath;
    const title = inlineCopy(market.comingToTitle, locale);
    const description = inlineCopy(market.comingToDescription, locale);
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
                countryName: locale === 'de' ? market.nameDe : market.nameEn,
                cities: market.cities.map((city) => ({
                    name: locale === 'de' ? city.nameDe : city.nameEn,
                    latitude: city.latitude,
                    longitude: city.longitude,
                })),
            }),
            jsonLdFaqPage(expansionMarketFaqEntries(market.comingToFaqs, locale)),
        ]),
    };
}

export function expansionMarketFoundingChefHead(market: ExpansionMarket, locale: Locale) {
    const webPageUrl = webPageUrlGet();
    const path = market.foundingChefPath;
    const title = inlineCopy(market.foundingChefTitle, locale);
    const description = inlineCopy(market.foundingChefDescription, locale);
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
                countryName: locale === 'de' ? market.nameDe : market.nameEn,
                cities: market.cities.map((city) => ({
                    name: locale === 'de' ? city.nameDe : city.nameEn,
                    latitude: city.latitude,
                    longitude: city.longitude,
                })),
            }),
            jsonLdFaqPage(expansionMarketFaqEntries(market.foundingChefFaqs, locale)),
        ]),
    };
}
