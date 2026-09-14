import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookTravelPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookTravelPage,
    profileCookTravelPageDescription,
    profileCookTravelPageTitle,
} from '../../../web/pages/profile/ProfileCookTravelPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/travel')({
    loader: routeLoaderGraphqlClient(ProfileCookTravelPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookTravelPageTitle[locale],
            description: profileCookTravelPageDescription[locale],
            path: '/profile/travel',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookTravelPage data={Route.useLoaderData()} />;
    },
});
