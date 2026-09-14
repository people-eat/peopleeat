import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookPublicPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileCookPublicSearch,
    ProfileCookPublicPage,
    profileCookPublicPageDescription,
    profileCookPublicPageTitle,
} from '../../../web/pages/profile/ProfileCookPublicPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/public')({
    validateSearch: (search: Record<string, unknown>) => parseProfileCookPublicSearch(search),
    loader: routeLoaderGraphqlClient(ProfileCookPublicPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookPublicPageTitle[locale],
            description: profileCookPublicPageDescription[locale],
            path: '/profile/public',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookPublicPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
