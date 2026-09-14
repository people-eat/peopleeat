import { createFileRoute } from '@tanstack/react-router';

import { AdminSupportRequestsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminSupportRequestsPage,
    adminSupportRequestsPageDescription,
    adminSupportRequestsPageTitle,
    adminSupportRequestsPageVariables,
    parseAdminSupportRequestsSearch,
} from '../../../web/pages/admin/AdminSupportRequestsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/support-requests')({
    validateSearch: (search: Record<string, unknown>) => parseAdminSupportRequestsSearch(search),
    loader: ({ location }) =>
        routeLoaderGraphqlClient(
            AdminSupportRequestsPageDocument,
            adminSupportRequestsPageVariables(parseAdminSupportRequestsSearch(location.search)),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminSupportRequestsPageTitle[locale],
            description: adminSupportRequestsPageDescription[locale],
            path: '/admin/support-requests',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const search = Route.useSearch();
        return <AdminSupportRequestsPage data={Route.useLoaderData()} search={search} />;
    },
});
