import { createFileRoute } from '@tanstack/react-router';

import { AdminFileStorePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminFileStorePage,
    adminFileStorePageDescription,
    adminFileStorePageTitle,
    adminFileStorePageVariables,
    parseAdminFileStoreSearch,
} from '../../../web/pages/admin/AdminFileStorePage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/file-store')({
    validateSearch: (search: Record<string, unknown>) => parseAdminFileStoreSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminFileStorePageDocument, adminFileStorePageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminFileStorePageTitle[locale],
            description: adminFileStorePageDescription[locale],
            path: '/admin/file-store',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminFileStorePage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
