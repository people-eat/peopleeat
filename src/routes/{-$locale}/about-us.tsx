import { createFileRoute } from '@tanstack/react-router';

import { AboutUsPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { AboutUsPage } from '../../web/pages/AboutUsPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/about-us')({
    loader: () => routeLoaderGraphqlClient(AboutUsPageDocument)(),
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const webPage = loaderData?.publicWebPage.findOne;
        if (!webPage) {
            return {};
        }
        const { title, description } = webPageSeoText(locale, webPage, 'about');
        return seoMeta({
            title,
            description,
            path: '/about-us',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <AboutUsPage data={Route.useLoaderData()} />;
    },
});
