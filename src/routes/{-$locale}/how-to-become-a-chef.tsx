import { createFileRoute } from '@tanstack/react-router';

import { HowToBecomeAChefPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { HowToBecomeAChefPage } from '../../web/pages/HowToBecomeAChefPage';
import { publicFaqJsonLdEntries } from '../../web/sections/SectionQuestionsAndAnswers';
import { jsonLdFaqPage } from '../../web/seo/jsonLd';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/how-to-become-a-chef')({
    loader: () => routeLoaderGraphqlClient(HowToBecomeAChefPageDocument)(),
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const webPage = loaderData?.publicWebPage.findOne;
        if (!webPage) {
            return {};
        }
        const { title, description } = webPageSeoText(locale, webPage, 'howToBecome');
        return {
            ...seoMeta({
                title,
                description,
                path: '/how-to-become-a-chef',
                locale,
                webPageUrl: webPageUrlGet(),
            }),
            scripts: [jsonLdFaqPage(publicFaqJsonLdEntries(locale))].map((script) => ({
                type: script.type,
                children: script.children,
            })),
        };
    },
    component() {
        return <HowToBecomeAChefPage data={Route.useLoaderData()} />;
    },
});
