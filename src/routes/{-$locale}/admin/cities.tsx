import { createFileRoute } from '@tanstack/react-router';

import { AdminCitiesPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminCitiesPage, adminCitiesPageDescription, adminCitiesPageTitle } from '../../../web/pages/admin/AdminCitiesPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/cities')({
    loader: routeLoaderGraphqlClient(AdminCitiesPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminCitiesPageTitle[locale],
            description: adminCitiesPageDescription[locale],
            path: '/admin/cities',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminCitiesPage data={Route.useLoaderData()} />;
    },
});
