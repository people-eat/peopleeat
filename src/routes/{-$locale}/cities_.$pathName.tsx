import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { cityCountryCodeLabel, cityCountryHubPath } from '../../shared/cityCountryCode';
import { contentLocaleText } from '../../shared/contentSection';
import { PublicCityPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { cityIndexLinkLabel, CityPage } from '../../web/pages/CityPage';
import { CITY_HERO_FALLBACK_IMAGE } from '../../web/pages/cityPageAssets';
import {
    jsonLdBreadcrumbList,
    jsonLdCityProduct,
    jsonLdCityService,
    jsonLdHeadScripts,
    jsonLdRatingFromValues,
} from '../../web/seo/jsonLd';
import { SITE_NAME } from '../../web/seo/seoConstants';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { DEFAULT_LOCALE, localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/cities_/$pathName')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(PublicCityPageDocument, {
            pathName: ctx.params.pathName,
        })();
        const city = data.publicCity.findOneByPathName;
        if (!city) {
            throw notFound();
        }
        if (city.pathName !== ctx.params.pathName) {
            const locale = localeFromParam(ctx.params);
            const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
            throw redirect({ href: `${prefix}/cities/${city.pathName}`, statusCode: 301 });
        }
        return data;
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const city = loaderData?.publicCity.findOneByPathName;
        if (!city) {
            return {};
        }
        const webPageUrl = webPageUrlGet();
        const path = `/cities/${city.pathName}`;
        const title = contentLocaleText(city.titleDe, city.titleEn, locale);
        const description = contentLocaleText(city.descriptionDe, city.descriptionEn, locale);
        const headline = contentLocaleText(city.headlineDe, city.headlineEn, locale).trim();
        const subheadline = contentLocaleText(city.subHeadlineDe, city.subHeadlineEn, locale).trim();
        const cityName = contentLocaleText(city.nameDe, city.nameEn, locale);
        const productName = headline || title;
        const productDescription = subheadline || description;
        const countryHubPath = cityCountryHubPath(city.countryCode);
        const breadcrumbMiddle =
            city.countryCode === 'DE'
                ? { name: cityIndexLinkLabel(locale), path: '/cities' }
                : { name: cityCountryCodeLabel(city.countryCode, locale), path: countryHubPath };
        const rating = jsonLdRatingFromValues(city.testimonials.map((entry) => entry.testimonial.rating));
        const cityJsonLdInput = {
            webPageUrl,
            locale,
            path,
            name: productName,
            description: productDescription,
            cityName,
            countryCode: city.countryCode,
            latitude: city.latitude,
            longitude: city.longitude,
            image: city.heroImageUrl ?? CITY_HERO_FALLBACK_IMAGE,
        };
        // Product without offers/review/aggregateRating is invalid in Search Console —
        // only emit Product when curated ratings are visible; otherwise Service.
        const cityEntity = rating ? jsonLdCityProduct({ ...cityJsonLdInput, rating }) : jsonLdCityService(cityJsonLdInput);
        return {
            ...seoMeta({
                title,
                description,
                path,
                locale,
                webPageUrl,
                image: city.heroImageUrl ?? undefined,
            }),
            scripts: jsonLdHeadScripts([
                jsonLdBreadcrumbList(webPageUrl, locale, [{ name: SITE_NAME, path: '/' }, breadcrumbMiddle, { name: productName, path }]),
                cityEntity,
            ]),
        };
    },
    component() {
        return <CityPage data={Route.useLoaderData()} />;
    },
});
