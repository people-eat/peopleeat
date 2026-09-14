import { createFileRoute } from '@tanstack/react-router';

import { AdminPartnersPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminPartnersPage, adminPartnersPageDescription, adminPartnersPageTitle } from '../../../web/pages/admin/AdminPartnersPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/partners')({
    loader: routeLoaderGraphqlClient(AdminPartnersPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminPartnersPageTitle[locale],
            description: adminPartnersPageDescription[locale],
            path: '/admin/partners',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminPartnersPage data={Route.useLoaderData()} />;
    },
});
