import { createFileRoute } from '@tanstack/react-router';

import { AdminSessionPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminSessionPage,
    adminSessionPageDescription,
    adminSessionPageTitle,
    adminSessionPageVariables,
} from '../../../web/pages/admin/AdminSessionPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/sessions_/$sessionId')({
    loader: ({ params }) => routeLoaderGraphqlClient(AdminSessionPageDocument, adminSessionPageVariables(params.sessionId))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminSessionPageTitle[locale],
            description: adminSessionPageDescription[locale],
            path: `/admin/sessions/${params.sessionId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminSessionPage data={Route.useLoaderData()} />;
    },
});
