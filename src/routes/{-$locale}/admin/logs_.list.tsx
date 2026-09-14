import { createFileRoute } from '@tanstack/react-router';

import { AdminLogsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminLogsSectionPath } from '../../../web/pages/admin/adminLogs';
import {
    AdminLogsPage,
    adminLogsPageDescription,
    adminLogsPageTitle,
    adminLogsPageVariables,
    parseAdminLogsSearch,
} from '../../../web/pages/admin/AdminLogsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/logs_/list')({
    validateSearch: (search: Record<string, unknown>) => parseAdminLogsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminLogsPageDocument, adminLogsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminLogsPageTitle[locale],
            description: adminLogsPageDescription[locale],
            path: adminLogsSectionPath('list'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminLogsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
