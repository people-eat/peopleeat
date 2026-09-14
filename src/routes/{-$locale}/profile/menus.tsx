import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookMenusPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileMenusSearch,
    ProfileCookMenusPage,
    profileCookMenusPageDescription,
    profileCookMenusPageTitle,
} from '../../../web/pages/profile/ProfileCookMenusPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/menus')({
    validateSearch: (search: Record<string, unknown>) => parseProfileMenusSearch(search),
    loader: routeLoaderGraphqlClient(ProfileCookMenusPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookMenusPageTitle[locale],
            description: profileCookMenusPageDescription[locale],
            path: '/profile/menus',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookMenusPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
