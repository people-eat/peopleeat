import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookFinancesPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileFinancesSearch,
    ProfileCookFinancesPage,
    profileCookFinancesPageDescription,
    profileCookFinancesPageTitle,
} from '../../../web/pages/profile/ProfileCookFinancesPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/finances')({
    validateSearch: (search: Record<string, unknown>) => parseProfileFinancesSearch(search),
    loader: routeLoaderGraphqlClient(ProfileCookFinancesPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookFinancesPageTitle(locale),
            description: profileCookFinancesPageDescription(locale),
            path: '/profile/finances',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookFinancesPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
