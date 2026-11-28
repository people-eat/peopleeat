import { createFileRoute } from '@tanstack/react-router';

import { PublicCitiesPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { CitiesPage } from '../../web/pages/CitiesPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/cities')({
    loader: () => routeLoaderGraphqlClient(PublicCitiesPageDocument)(),
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
            path: '/cities',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <CitiesPage data={Route.useLoaderData()} />;
    },
});
