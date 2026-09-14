import { createFileRoute } from '@tanstack/react-router';

import { AdminWebPagesPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminWebPagesPage, adminWebPagesPageDescription, adminWebPagesPageTitle } from '../../../web/pages/admin/AdminWebPagesPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/web-pages')({
    loader: routeLoaderGraphqlClient(AdminWebPagesPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminWebPagesPageTitle[locale],
            description: adminWebPagesPageDescription[locale],
            path: '/admin/web-pages',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminWebPagesPage data={Route.useLoaderData()} />;
    },
});
