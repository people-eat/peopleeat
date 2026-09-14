import { createFileRoute } from '@tanstack/react-router';

import { AdminMenusPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminMenusPage,
    adminMenusPageDescription,
    adminMenusPageTitle,
    adminMenusPageVariables,
    parseAdminMenusSearch,
} from '../../../web/pages/admin/AdminMenusPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/menus')({
    validateSearch: (search: Record<string, unknown>) => parseAdminMenusSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminMenusPageDocument, adminMenusPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminMenusPageTitle[locale],
            description: adminMenusPageDescription[locale],
            path: '/admin/menus',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminMenusPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
