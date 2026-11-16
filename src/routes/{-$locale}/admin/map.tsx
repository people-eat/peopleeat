import { createFileRoute } from '@tanstack/react-router';

import { AdminMapPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminMapPage,
    adminMapPageDescription,
    adminMapPageTitle,
    adminMapPageVariables,
    parseAdminMapSearch,
} from '../../../web/pages/admin/AdminMapPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/map')({
    validateSearch: (search: Record<string, unknown>) => parseAdminMapSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminMapPageDocument, adminMapPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminMapPageTitle(locale),
            description: adminMapPageDescription(locale),
            path: '/admin/map',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminMapPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
