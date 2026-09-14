import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookBookingRequestOffersPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileCookBookingRequestOffersSearch,
    ProfileCookBookingRequestOffersPage,
    profileCookBookingRequestOffersPageDescription,
    profileCookBookingRequestOffersPageTitle,
} from '../../../web/pages/profile/ProfileCookBookingRequestOffersPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-request-offers')({
    validateSearch: (search: Record<string, unknown>) => parseProfileCookBookingRequestOffersSearch(search),
    loader: routeLoaderGraphqlClient(ProfileCookBookingRequestOffersPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookBookingRequestOffersPageTitle[locale],
            description: profileCookBookingRequestOffersPageDescription[locale],
            path: '/profile/booking-request-offers',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookBookingRequestOffersPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
