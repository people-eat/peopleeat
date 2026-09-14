import { createFileRoute } from '@tanstack/react-router';

import { AdminOccasionsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminOccasionsPage, adminOccasionsPageDescription, adminOccasionsPageTitle } from '../../../web/pages/admin/AdminOccasionsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/occasions')({
    loader: routeLoaderGraphqlClient(AdminOccasionsPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminOccasionsPageTitle[locale],
            description: adminOccasionsPageDescription[locale],
            path: '/admin/occasions',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminOccasionsPage data={Route.useLoaderData()} />;
    },
});
