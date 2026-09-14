import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookBookingRequestOfferPriceEditPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookBookingRequestOfferPriceEditPage,
    profileCookBookingRequestOfferPriceEditPageDescription,
    profileCookBookingRequestOfferPriceEditPageTitle,
    profileCookBookingRequestOfferPriceEditPageVariables,
} from '../../../web/pages/profile/ProfileCookBookingRequestOfferPriceEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-request-offers_/$bookingRequestOfferId_/edit-price')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            ProfileCookBookingRequestOfferPriceEditPageDocument,
            profileCookBookingRequestOfferPriceEditPageVariables(params.bookingRequestOfferId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookBookingRequestOfferPriceEditPageTitle[locale],
            description: profileCookBookingRequestOfferPriceEditPageDescription[locale],
            path: `/profile/booking-request-offers/${params.bookingRequestOfferId}/edit-price`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestOfferId } = Route.useParams();
        return (
            <ProfileCookBookingRequestOfferPriceEditPage
                key={bookingRequestOfferId}
                data={Route.useLoaderData()}
                bookingRequestOfferId={bookingRequestOfferId}
            />
        );
    },
});
