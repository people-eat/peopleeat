import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookBookingRequestOfferPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileCookBookingRequestOfferSearch,
    ProfileCookBookingRequestOfferPage,
    profileCookBookingRequestOfferPageDescription,
    profileCookBookingRequestOfferPageTitle,
    profileCookBookingRequestOfferPageVariables,
} from '../../../web/pages/profile/ProfileCookBookingRequestOfferPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-request-offers_/$bookingRequestOfferId')({
    validateSearch: (search: Record<string, unknown>) => parseProfileCookBookingRequestOfferSearch(search),
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            ProfileCookBookingRequestOfferPageDocument,
            profileCookBookingRequestOfferPageVariables(params.bookingRequestOfferId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookBookingRequestOfferPageTitle[locale],
            description: profileCookBookingRequestOfferPageDescription[locale],
            path: `/profile/booking-request-offers/${params.bookingRequestOfferId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestOfferId } = Route.useParams();
        return (
            <ProfileCookBookingRequestOfferPage
                key={bookingRequestOfferId}
                data={Route.useLoaderData()}
                search={Route.useSearch()}
                bookingRequestOfferId={bookingRequestOfferId}
            />
        );
    },
});
