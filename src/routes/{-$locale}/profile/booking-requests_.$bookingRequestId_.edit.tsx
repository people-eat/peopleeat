import { createFileRoute } from '@tanstack/react-router';

import { ProfileCustomerBookingRequestPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCustomerBookingRequestEditPage,
    profileCustomerBookingRequestEditPageDescription,
    profileCustomerBookingRequestEditPageTitle,
    profileCustomerBookingRequestEditPageVariables,
} from '../../../web/pages/profile/ProfileCustomerBookingRequestEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-requests_/$bookingRequestId_/edit')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            ProfileCustomerBookingRequestPageDocument,
            profileCustomerBookingRequestEditPageVariables(params.bookingRequestId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCustomerBookingRequestEditPageTitle[locale],
            description: profileCustomerBookingRequestEditPageDescription[locale],
            path: `/profile/booking-requests/${params.bookingRequestId}/edit`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId } = Route.useParams();
        return (
            <ProfileCustomerBookingRequestEditPage
                key={bookingRequestId}
                data={Route.useLoaderData()}
                bookingRequestId={bookingRequestId}
            />
        );
    },
});
