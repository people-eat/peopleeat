import { createFileRoute } from '@tanstack/react-router';

import { AdminSupportRequestPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminSupportRequestPage,
    adminSupportRequestPageDescription,
    adminSupportRequestPageTitle,
    adminSupportRequestPageVariables,
} from '../../../web/pages/admin/AdminSupportRequestPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/support-requests_/$supportRequestId')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(AdminSupportRequestPageDocument, adminSupportRequestPageVariables(params.supportRequestId))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminSupportRequestPageTitle[locale],
            description: adminSupportRequestPageDescription[locale],
            path: `/admin/support-requests/${params.supportRequestId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { supportRequestId } = Route.useParams();
        return <AdminSupportRequestPage data={Route.useLoaderData()} supportRequestId={supportRequestId} />;
    },
});
