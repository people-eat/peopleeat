import { createFileRoute } from '@tanstack/react-router';

import { AdminOverviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminOverviewPage, adminOverviewPageTitle, adminOverviewPageVariables } from '../../../web/pages/admin/AdminOverviewPage';
import { adminPageDescription } from '../../../web/pages/admin/adminShellLabels';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/')({
    loader: () => routeLoaderGraphqlClient(AdminOverviewPageDocument, adminOverviewPageVariables())(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminOverviewPageTitle[locale],
            description: adminPageDescription[locale],
            path: '/admin',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminOverviewPage data={Route.useLoaderData()} />;
    },
});
