import { createFileRoute } from '@tanstack/react-router';

import { ProfileCustomerBookingRequestsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCustomerBookingRequestsPage,
    profileCustomerBookingRequestsPageDescription,
    profileCustomerBookingRequestsPageTitle,
} from '../../../web/pages/profile/ProfileCustomerBookingRequestsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-requests')({
    loader: routeLoaderGraphqlClient(ProfileCustomerBookingRequestsPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCustomerBookingRequestsPageTitle[locale],
            description: profileCustomerBookingRequestsPageDescription[locale],
            path: '/profile/booking-requests',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCustomerBookingRequestsPage data={Route.useLoaderData()} />;
    },
});
