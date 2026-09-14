import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookTravelPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookTravelEditPage,
    profileCookTravelEditPageDescription,
    profileCookTravelEditPageTitle,
} from '../../../web/pages/profile/ProfileCookTravelEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/travel_/edit')({
    loader: routeLoaderGraphqlClient(ProfileCookTravelPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookTravelEditPageTitle[locale],
            description: profileCookTravelEditPageDescription[locale],
            path: '/profile/travel/edit',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookTravelEditPage data={Route.useLoaderData()} />;
    },
});
