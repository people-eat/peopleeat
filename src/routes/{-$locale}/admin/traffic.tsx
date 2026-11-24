import { createFileRoute } from '@tanstack/react-router';

import { AdminTrafficPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminTrafficPage,
    adminTrafficPageDescription,
    adminTrafficPageTitle,
    adminTrafficPageVariables,
} from '../../../web/pages/admin/AdminTrafficPage';
import { parseAdminTrafficSearch } from '../../../web/pages/admin/adminTrafficSearch';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/traffic')({
    validateSearch: (search: Record<string, unknown>) => parseAdminTrafficSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminTrafficPageDocument, adminTrafficPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminTrafficPageTitle(locale),
            description: adminTrafficPageDescription(locale),
            path: '/admin/traffic',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminTrafficPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
