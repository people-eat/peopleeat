import { createFileRoute } from '@tanstack/react-router';

import { AdminAiGenerationsOverviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminAiGenerationsOverviewPage,
    adminAiGenerationsOverviewPageDescription,
    adminAiGenerationsOverviewPageTitle,
    adminAiGenerationsOverviewPageVariables,
} from '../../../web/pages/admin/AdminAiGenerationsOverviewPage';
import { parseAdminOverviewRangeSearch } from '../../../web/pages/admin/adminOverviewRange';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/ai-generations')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOverviewRangeSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminAiGenerationsOverviewPageDocument, adminAiGenerationsOverviewPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminAiGenerationsOverviewPageTitle[locale],
            description: adminAiGenerationsOverviewPageDescription[locale],
            path: '/admin/ai-generations',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminAiGenerationsOverviewPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
