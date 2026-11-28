import { createFileRoute } from '@tanstack/react-router';

import { PublicOccasionsPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { OccasionsPage } from '../../web/pages/OccasionsPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/occasions')({
    loader: () => routeLoaderGraphqlClient(PublicOccasionsPageDocument)(),
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const webPage = loaderData?.publicWebPage.findOne;
        if (!webPage) {
            return {};
        }
        return seoMeta({
            title: webPageSeoText(locale, webPage).title,
            description: webPageSeoText(locale, webPage).description,
            path: '/occasions',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <OccasionsPage data={Route.useLoaderData()} />;
    },
});
