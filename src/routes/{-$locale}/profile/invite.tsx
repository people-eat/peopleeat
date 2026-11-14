import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookInvitePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookInvitePage,
    profileCookInvitePageDescription,
    profileCookInvitePageTitle,
} from '../../../web/pages/profile/ProfileCookInvitePage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/invite')({
    loader: routeLoaderGraphqlClient(ProfileCookInvitePageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookInvitePageTitle[locale],
            description: profileCookInvitePageDescription[locale],
            path: '/profile/invite',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookInvitePage data={Route.useLoaderData()} />;
    },
});
