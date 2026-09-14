import { createFileRoute } from '@tanstack/react-router';

import { ProfileCustomerBookingRequestOfferPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileCustomerBookingRequestOfferSearch,
    ProfileCustomerBookingRequestOfferPage,
    profileCustomerBookingRequestOfferPageDescription,
    profileCustomerBookingRequestOfferPageTitle,
    profileCustomerBookingRequestOfferPageVariables,
} from '../../../web/pages/profile/ProfileCustomerBookingRequestOfferPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-requests_/$bookingRequestId_/offers_/$bookingRequestOfferId')({
    validateSearch: (search: Record<string, unknown>) => parseProfileCustomerBookingRequestOfferSearch(search),
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            ProfileCustomerBookingRequestOfferPageDocument,
            profileCustomerBookingRequestOfferPageVariables(params.bookingRequestId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCustomerBookingRequestOfferPageTitle[locale],
            description: profileCustomerBookingRequestOfferPageDescription[locale],
            path: `/profile/booking-requests/${params.bookingRequestId}/offers/${params.bookingRequestOfferId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId, bookingRequestOfferId } = Route.useParams();
        return (
            <ProfileCustomerBookingRequestOfferPage
                key={bookingRequestOfferId}
                data={Route.useLoaderData()}
                search={Route.useSearch()}
                bookingRequestId={bookingRequestId}
                bookingRequestOfferId={bookingRequestOfferId}
            />
        );
    },
});
