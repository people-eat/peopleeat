import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookCallsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookCallsPage,
    profileCookCallsPageDescription,
    profileCookCallsPageTitle,
} from '../../../web/pages/profile/ProfileCookCallsPage';
import { profileCookCallsPageVariables } from '../../../web/pages/profile/profileCookCallsPageVariables';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/calls')({
    loader: routeLoaderGraphqlClient(ProfileCookCallsPageDocument, profileCookCallsPageVariables()),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookCallsPageTitle[locale],
            description: profileCookCallsPageDescription[locale],
            path: '/profile/calls',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookCallsPage data={Route.useLoaderData()} />;
    },
});
