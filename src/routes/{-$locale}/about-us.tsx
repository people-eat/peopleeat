import { createFileRoute } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { AboutUsPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { AboutUsPage } from '../../web/pages/AboutUsPage';
import { seoMeta } from '../../web/seo/seoMeta';
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
        return seoMeta({
            title: contentLocaleText(webPage.titleDe, webPage.titleEn, locale),
            description: contentLocaleText(webPage.descriptionDe, webPage.descriptionEn, locale),
            path: '/about-us',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <AboutUsPage data={Route.useLoaderData()} />;
    },
});
