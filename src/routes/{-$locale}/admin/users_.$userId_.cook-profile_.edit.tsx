import { createFileRoute } from '@tanstack/react-router';

import { AdminUserCookProfileEditPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminUserCookProfileEditPage,
    adminUserCookProfileEditPageDescription,
    adminUserCookProfileEditPageTitle,
    adminUserCookProfileEditPageVariables,
} from '../../../web/pages/admin/AdminUserCookProfileEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/users_/$userId_/cook-profile_/edit')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(AdminUserCookProfileEditPageDocument, adminUserCookProfileEditPageVariables(params.userId))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminUserCookProfileEditPageTitle[locale],
            description: adminUserCookProfileEditPageDescription[locale],
            path: `/admin/users/${params.userId}/cook-profile/edit`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { userId } = Route.useParams();
        return <AdminUserCookProfileEditPage data={Route.useLoaderData()} userId={userId} />;
    },
});
