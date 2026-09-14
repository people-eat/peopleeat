import { createFileRoute } from '@tanstack/react-router';

import { AdminSessionsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminSessionsSectionPath } from '../../../web/pages/admin/adminSessions';
import {
    AdminSessionsPage,
    adminSessionsPageDescription,
    adminSessionsPageTitle,
    adminSessionsPageVariables,
    parseAdminSessionsSearch,
} from '../../../web/pages/admin/AdminSessionsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/sessions_/list')({
    validateSearch: (search: Record<string, unknown>) => parseAdminSessionsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminSessionsPageDocument, adminSessionsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminSessionsPageTitle[locale],
            description: adminSessionsPageDescription[locale],
            path: adminSessionsSectionPath('list'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminSessionsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
