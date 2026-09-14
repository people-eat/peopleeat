import { createFileRoute } from '@tanstack/react-router';

import { AdminLogPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminLogPage, adminLogPageDescription, adminLogPageTitle } from '../../../web/pages/admin/AdminLogPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/logs_/$logId')({
    loader: ({ params }) => routeLoaderGraphqlClient(AdminLogPageDocument, { logId: params.logId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminLogPageTitle[locale],
            description: adminLogPageDescription[locale],
            path: `/admin/logs/${params.logId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminLogPage data={Route.useLoaderData()} />;
    },
});
