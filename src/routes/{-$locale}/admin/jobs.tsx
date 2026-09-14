import { createFileRoute } from '@tanstack/react-router';

import { AdminJobsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminJobsPage, adminJobsPageDescription, adminJobsPageTitle, parseAdminJobsSearch } from '../../../web/pages/admin/AdminJobsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/jobs')({
    validateSearch: (search: Record<string, unknown>) => parseAdminJobsSearch(search),
    loader: routeLoaderGraphqlClient(AdminJobsPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminJobsPageTitle[locale],
            description: adminJobsPageDescription[locale],
            path: '/admin/jobs',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminJobsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
