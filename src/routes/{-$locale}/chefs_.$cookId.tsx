import { createFileRoute, notFound } from '@tanstack/react-router';

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
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/chefs_/$cookId')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(ChefPageDocument, {
            cookId: ctx.params.cookId,
        })();
        if (!data.publicCook.findOne) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const cook = loaderData?.publicCook.findOne;
        if (!cook) {
            return {};
        }
        const webPageUrl = webPageUrlGet();
        const name = cook.user.display;
        const cityLabel = chefPageCityLabel(locale, cook.city, cook.cityPage);
        const path = `/chefs/${cook.cookId}`;
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
