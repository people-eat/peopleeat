import { createFileRoute } from '@tanstack/react-router';

import { PublicVenuesPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { VenuesPage } from '../../web/pages/VenuesPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/venues')({
    loader: () => routeLoaderGraphqlClient(PublicVenuesPageDocument)(),
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
            path: '/venues',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <VenuesPage data={Route.useLoaderData()} />;
    },
});
