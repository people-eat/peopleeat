import { createFileRoute } from '@tanstack/react-router';

import { AdminAnalyticsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminAnalyticsPage, adminAnalyticsPageDescription, adminAnalyticsPageTitle } from '../../../web/pages/admin/AdminAnalyticsPage';
import { adminAnalyticsPageVariables, parseAdminAnalyticsSearch } from '../../../web/pages/admin/adminAnalyticsSearch';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/analytics')({
    validateSearch: (search: Record<string, unknown>) => parseAdminAnalyticsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminAnalyticsPageDocument, adminAnalyticsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminAnalyticsPageTitle(locale),
            description: adminAnalyticsPageDescription(locale),
            path: '/admin/analytics',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminAnalyticsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
