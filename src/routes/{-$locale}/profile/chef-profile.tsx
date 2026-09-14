import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookChefProfilePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookChefProfilePage,
    profileCookChefProfilePageDescription,
    profileCookChefProfilePageTitle,
} from '../../../web/pages/profile/ProfileCookChefProfilePage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/chef-profile')({
    loader: routeLoaderGraphqlClient(ProfileCookChefProfilePageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookChefProfilePageTitle[locale],
            description: profileCookChefProfilePageDescription[locale],
            path: '/profile/chef-profile',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookChefProfilePage data={Route.useLoaderData()} />;
    },
});
