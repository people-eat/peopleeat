import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookChefProfilePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookChefProfileEditPage,
    profileCookChefProfileEditPageDescription,
    profileCookChefProfileEditPageTitle,
} from '../../../web/pages/profile/ProfileCookChefProfileEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/chef-profile_/edit')({
    loader: routeLoaderGraphqlClient(ProfileCookChefProfilePageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookChefProfileEditPageTitle[locale],
            description: profileCookChefProfileEditPageDescription[locale],
            path: '/profile/chef-profile/edit',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookChefProfileEditPage data={Route.useLoaderData()} />;
    },
});
