import { createFileRoute } from '@tanstack/react-router';

import { AdminCallsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminCallsSectionPath } from '../../../web/pages/admin/adminCalls';
import {
    AdminCallsPage,
    adminCallsPageDescription,
    adminCallsPageTitle,
    adminCallsPageVariables,
    parseAdminCallsSearch,
} from '../../../web/pages/admin/AdminCallsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/calls_/list')({
    validateSearch: (search: Record<string, unknown>) => parseAdminCallsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminCallsPageDocument, adminCallsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminCallsPageTitle[locale],
            description: adminCallsPageDescription[locale],
            path: adminCallsSectionPath('list'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminCallsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
