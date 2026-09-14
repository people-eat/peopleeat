import { createFileRoute } from '@tanstack/react-router';

import { AdminUsersPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminUsersSectionPath } from '../../../web/pages/admin/adminUsers';
import {
    AdminUsersPage,
    adminUsersPageDescription,
    adminUsersPageTitle,
    adminUsersPageVariables,
    parseAdminUsersSearch,
} from '../../../web/pages/admin/AdminUsersPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/users_/list')({
    validateSearch: (search: Record<string, unknown>) => parseAdminUsersSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminUsersPageDocument, adminUsersPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminUsersPageTitle[locale],
            description: adminUsersPageDescription[locale],
            path: adminUsersSectionPath('list'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminUsersPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
