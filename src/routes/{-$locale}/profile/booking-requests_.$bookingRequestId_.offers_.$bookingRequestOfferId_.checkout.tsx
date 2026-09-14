import { createFileRoute } from '@tanstack/react-router';

import { ProfileCustomerBookingRequestOfferCheckoutPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCustomerBookingRequestOfferCheckoutPage,
    profileCustomerBookingRequestOfferCheckoutPageDescription,
    profileCustomerBookingRequestOfferCheckoutPageTitle,
    profileCustomerBookingRequestOfferCheckoutPageVariables,
} from '../../../web/pages/profile/ProfileCustomerBookingRequestOfferCheckoutPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-requests_/$bookingRequestId_/offers_/$bookingRequestOfferId_/checkout')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            ProfileCustomerBookingRequestOfferCheckoutPageDocument,
            profileCustomerBookingRequestOfferCheckoutPageVariables(params.bookingRequestId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCustomerBookingRequestOfferCheckoutPageTitle[locale],
            description: profileCustomerBookingRequestOfferCheckoutPageDescription[locale],
            path: `/profile/booking-requests/${params.bookingRequestId}/offers/${params.bookingRequestOfferId}/checkout`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId, bookingRequestOfferId } = Route.useParams();
        return (
            <ProfileCustomerBookingRequestOfferCheckoutPage
                key={bookingRequestOfferId}
                data={Route.useLoaderData()}
                bookingRequestId={bookingRequestId}
                bookingRequestOfferId={bookingRequestOfferId}
            />
        );
    },
});
