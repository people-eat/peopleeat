import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { PublicCityPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { CityPage } from '../../web/pages/CityPage';
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
        return seoMeta({
            title: contentLocaleText(city.titleDe, city.titleEn, locale),
            description: contentLocaleText(city.descriptionDe, city.descriptionEn, locale),
            path: `/cities/${city.pathName}`,
            locale,
            webPageUrl: webPageUrlGet(),
            image: city.heroImageUrl ?? undefined,
        });
    },
    component() {
        return <CityPage data={Route.useLoaderData()} />;
    },
});
