import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookBookingRequestOfferMenusEditPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileCookBookingRequestOfferMenusEditSearch,
    ProfileCookBookingRequestOfferMenusEditPage,
    profileCookBookingRequestOfferMenusEditPageDescription,
    profileCookBookingRequestOfferMenusEditPageTitle,
    profileCookBookingRequestOfferMenusEditPageVariables,
} from '../../../web/pages/profile/ProfileCookBookingRequestOfferMenusEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-request-offers_/$bookingRequestOfferId_/edit-menus')({
    validateSearch: (search: Record<string, unknown>) => parseProfileCookBookingRequestOfferMenusEditSearch(search),
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            ProfileCookBookingRequestOfferMenusEditPageDocument,
            profileCookBookingRequestOfferMenusEditPageVariables(params.bookingRequestOfferId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookBookingRequestOfferMenusEditPageTitle[locale],
            description: profileCookBookingRequestOfferMenusEditPageDescription[locale],
            path: `/profile/booking-request-offers/${params.bookingRequestOfferId}/edit-menus`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestOfferId } = Route.useParams();
        return (
            <ProfileCookBookingRequestOfferMenusEditPage
                key={bookingRequestOfferId}
                data={Route.useLoaderData()}
                bookingRequestOfferId={bookingRequestOfferId}
                search={Route.useSearch()}
            />
        );
    },
});
