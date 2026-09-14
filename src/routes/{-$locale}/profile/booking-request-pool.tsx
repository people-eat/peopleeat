import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookBookingRequestPoolPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileCookBookingRequestPoolSearch,
    ProfileCookBookingRequestPoolPage,
    profileCookBookingRequestPoolPageDescription,
    profileCookBookingRequestPoolPageTitle,
} from '../../../web/pages/profile/ProfileCookBookingRequestPoolPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-request-pool')({
    validateSearch: (search: Record<string, unknown>) => parseProfileCookBookingRequestPoolSearch(search),
    loader: routeLoaderGraphqlClient(ProfileCookBookingRequestPoolPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookBookingRequestPoolPageTitle[locale],
            description: profileCookBookingRequestPoolPageDescription[locale],
            path: '/profile/booking-request-pool',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookBookingRequestPoolPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
