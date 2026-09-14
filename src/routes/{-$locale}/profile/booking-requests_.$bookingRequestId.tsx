import { createFileRoute } from '@tanstack/react-router';

import { ProfileCustomerBookingRequestPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileCustomerBookingRequestSearch,
    ProfileCustomerBookingRequestPage,
    profileCustomerBookingRequestPageDescription,
    profileCustomerBookingRequestPageTitle,
    profileCustomerBookingRequestPageVariables,
} from '../../../web/pages/profile/ProfileCustomerBookingRequestPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-requests_/$bookingRequestId')({
    validateSearch: (search: Record<string, unknown>) => parseProfileCustomerBookingRequestSearch(search),
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            ProfileCustomerBookingRequestPageDocument,
            profileCustomerBookingRequestPageVariables(params.bookingRequestId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCustomerBookingRequestPageTitle[locale],
            description: profileCustomerBookingRequestPageDescription[locale],
            path: `/profile/booking-requests/${params.bookingRequestId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId } = Route.useParams();
        const search = Route.useSearch();
        return (
            <ProfileCustomerBookingRequestPage
                key={bookingRequestId}
                data={Route.useLoaderData()}
                bookingRequestId={bookingRequestId}
                search={search}
            />
        );
    },
});
