import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookBookingRequestOfferCreatePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileCookBookingRequestOfferCreateSearch,
    ProfileCookBookingRequestOfferCreatePage,
    profileCookBookingRequestOfferCreatePageDescription,
    profileCookBookingRequestOfferCreatePageTitle,
} from '../../../web/pages/profile/ProfileCookBookingRequestOfferCreatePage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-request-pool_/$bookingRequestId_/create')({
    validateSearch: (search: Record<string, unknown>) => parseProfileCookBookingRequestOfferCreateSearch(search),
    loader: ({ params }) =>
        routeLoaderGraphqlClient(ProfileCookBookingRequestOfferCreatePageDocument, {
            bookingRequestId: params.bookingRequestId,
        })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookBookingRequestOfferCreatePageTitle[locale],
            description: profileCookBookingRequestOfferCreatePageDescription[locale],
            path: `/profile/booking-request-pool/${params.bookingRequestId}/create`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId } = Route.useParams();
        return (
            <ProfileCookBookingRequestOfferCreatePage
                key={bookingRequestId}
                data={Route.useLoaderData()}
                bookingRequestId={bookingRequestId}
                search={Route.useSearch()}
            />
        );
    },
});
