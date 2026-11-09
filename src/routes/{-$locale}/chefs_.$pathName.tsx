import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { ChefPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { ChefPage } from '../../web/pages/ChefPage';
import { chefsIndexLinkLabel } from '../../web/sections/SectionCookHero';
import { publicFaqJsonLdEntries } from '../../web/sections/SectionQuestionsAndAnswers';
import { chefPageCityLabel, chefPageDescription, chefPageTitle } from '../../web/seo/chefPageSeo';
import { jsonLdBreadcrumbList, jsonLdFaqPage, jsonLdHeadScripts, jsonLdPerson } from '../../web/seo/jsonLd';
import { SITE_NAME } from '../../web/seo/seoConstants';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { DEFAULT_LOCALE, localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/chefs_/$pathName')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(ChefPageDocument, {
            pathName: ctx.params.pathName,
        })();
        const cook = data.publicCook.findOneByPathName;
        if (!cook) {
            throw notFound();
        }
        if (cook.pathName !== ctx.params.pathName) {
            const locale = localeFromParam(ctx.params);
            const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
            throw redirect({ href: `${prefix}/chefs/${cook.pathName}`, statusCode: 301 });
        }
        return data;
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const cook = loaderData?.publicCook.findOneByPathName;
        if (!cook) {
            return {};
        }
        const webPageUrl = webPageUrlGet();
        const name = cook.user.display;
        const cityLabel = chefPageCityLabel(locale, cook.city, cook.cityPage);
        const path = `/chefs/${cook.pathName}`;
        const title = chefPageTitle(locale, name, cityLabel);
        const description = chefPageDescription(locale, {
            name,
            city: cityLabel,
            cuisineStyle: cook.cuisineStyle,
            biographySummary: cook.biographySummary,
        });
        return {
            ...seoMeta({
                title,
                description,
                path,
                locale,
                webPageUrl,
                image: cook.user.profilePicture?.url ?? undefined,
            }),
            scripts: jsonLdHeadScripts([
                jsonLdBreadcrumbList(webPageUrl, locale, [
                    { name: SITE_NAME, path: '/' },
                    { name: chefsIndexLinkLabel(locale), path: '/chefs' },
                    { name, path },
                ]),
                jsonLdPerson({
                    webPageUrl,
                    locale,
                    path,
                    name,
                    description,
                    image: cook.user.profilePicture?.url,
                    cityName: cityLabel,
                }),
                jsonLdFaqPage(publicFaqJsonLdEntries(locale)),
            ]),
        };
    },
    component() {
        return <ChefPage data={Route.useLoaderData()} />;
    },
});
