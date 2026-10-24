import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookAnalyticsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileCookAnalyticsSearch,
    ProfileCookAnalyticsPage,
    profileCookAnalyticsPageDescription,
    profileCookAnalyticsPageTitle,
} from '../../../web/pages/profile/ProfileCookAnalyticsPage';
import { profileCookAnalyticsPageVariables } from '../../../web/pages/profile/profileCookAnalyticsPeriod';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/analytics')({
    validateSearch: (search: Record<string, unknown>) => parseProfileCookAnalyticsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(ProfileCookAnalyticsPageDocument, profileCookAnalyticsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookAnalyticsPageTitle[locale],
            description: profileCookAnalyticsPageDescription[locale],
            path: '/profile/analytics',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookAnalyticsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
