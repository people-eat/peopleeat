import { createFileRoute } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { HomePageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { HomePage } from '../../web/pages/HomePage';
import { publicFaqJsonLdEntries } from '../../web/sections/SectionQuestionsAndAnswers';
import { jsonLdFaqPage, jsonLdScripts } from '../../web/seo/jsonLd';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/')({
    loader: () => routeLoaderGraphqlClient(HomePageDocument)(),
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const webPageUrl = webPageUrlGet();
        const webPage = loaderData?.publicWebPage.findOne;
        if (!webPage) {
            return {};
        }
        return {
            ...seoMeta({
                title: contentLocaleText(webPage.titleDe, webPage.titleEn, locale),
                description: contentLocaleText(webPage.descriptionDe, webPage.descriptionEn, locale),
                path: '/',
                locale,
                webPageUrl,
            }),
            scripts: [...jsonLdScripts(webPageUrl), jsonLdFaqPage(publicFaqJsonLdEntries(locale))].map((script) => ({
                type: script.type,
                children: script.children,
            })),
        };
    },
    component() {
        return <HomePage loaderData={Route.useLoaderData()} />;
    },
});
