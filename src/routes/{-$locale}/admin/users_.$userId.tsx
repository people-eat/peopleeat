import { createFileRoute } from '@tanstack/react-router';

import { AdminUserPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminUserPage,
    adminUserPageDescription,
    adminUserPageTitle,
    adminUserPageVariables,
    parseAdminUserSearch,
} from '../../../web/pages/admin/AdminUserPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/users_/$userId')({
    validateSearch: (search: Record<string, unknown>) => parseAdminUserSearch(search),
    loaderDeps: ({ search }) => ({ tab: search.tab }),
    loader: ({ params, deps }) =>
        routeLoaderGraphqlClient(AdminUserPageDocument, adminUserPageVariables(params.userId, { tab: deps.tab }))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminUserPageTitle[locale],
            description: adminUserPageDescription[locale],
            path: `/admin/users/${params.userId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminUserPage data={Route.useLoaderData()} search={Route.useSearch()} userId={Route.useParams().userId} />;
    },
});
