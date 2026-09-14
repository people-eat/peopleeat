import { createFileRoute } from '@tanstack/react-router';

import { AdminSessionsOverviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { parseAdminOverviewRangeSearch } from '../../../web/pages/admin/adminOverviewRange';
import {
    AdminSessionsOverviewPage,
    adminSessionsOverviewPageDescription,
    adminSessionsOverviewPageTitle,
    adminSessionsOverviewPageVariables,
} from '../../../web/pages/admin/AdminSessionsOverviewPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/sessions')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOverviewRangeSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminSessionsOverviewPageDocument, adminSessionsOverviewPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminSessionsOverviewPageTitle[locale],
            description: adminSessionsOverviewPageDescription[locale],
            path: '/admin/sessions',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminSessionsOverviewPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
