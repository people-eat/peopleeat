import { createFileRoute } from '@tanstack/react-router';

import { AdminCallsOverviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminCallsOverviewPage,
    adminCallsOverviewPageDescription,
    adminCallsOverviewPageTitle,
    adminCallsOverviewPageVariables,
} from '../../../web/pages/admin/AdminCallsOverviewPage';
import { parseAdminOverviewRangeSearch } from '../../../web/pages/admin/adminOverviewRange';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/calls')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOverviewRangeSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminCallsOverviewPageDocument, adminCallsOverviewPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminCallsOverviewPageTitle[locale],
            description: adminCallsOverviewPageDescription[locale],
            path: '/admin/calls',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminCallsOverviewPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
