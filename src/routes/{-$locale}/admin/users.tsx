import { createFileRoute } from '@tanstack/react-router';

import { AdminUsersOverviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { parseAdminOverviewRangeSearch } from '../../../web/pages/admin/adminOverviewRange';
import {
    AdminUsersOverviewPage,
    adminUsersOverviewPageDescription,
    adminUsersOverviewPageTitle,
    adminUsersOverviewPageVariables,
} from '../../../web/pages/admin/AdminUsersOverviewPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/users')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOverviewRangeSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminUsersOverviewPageDocument, adminUsersOverviewPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminUsersOverviewPageTitle[locale],
            description: adminUsersOverviewPageDescription[locale],
            path: '/admin/users',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminUsersOverviewPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
