import { createFileRoute } from '@tanstack/react-router';

import { AdminLogsOverviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminLogsOverviewPage,
    adminLogsOverviewPageDescription,
    adminLogsOverviewPageTitle,
    adminLogsOverviewPageVariables,
} from '../../../web/pages/admin/AdminLogsOverviewPage';
import { parseAdminOverviewRangeSearch } from '../../../web/pages/admin/adminOverviewRange';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/logs')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOverviewRangeSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminLogsOverviewPageDocument, adminLogsOverviewPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminLogsOverviewPageTitle[locale],
            description: adminLogsOverviewPageDescription[locale],
            path: '/admin/logs',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminLogsOverviewPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
