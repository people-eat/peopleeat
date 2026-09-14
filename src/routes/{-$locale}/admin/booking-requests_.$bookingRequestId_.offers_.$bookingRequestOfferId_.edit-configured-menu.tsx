import { createFileRoute } from '@tanstack/react-router';

import { AdminBookingRequestOfferConfiguredMenuEditPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminBookingRequestOfferConfiguredMenuEditPage,
    adminBookingRequestOfferConfiguredMenuEditPageDescription,
    adminBookingRequestOfferConfiguredMenuEditPageTitle,
    adminBookingRequestOfferConfiguredMenuEditPageVariables,
} from '../../../web/pages/admin/AdminBookingRequestOfferConfiguredMenuEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute(
    '/{-$locale}/admin/booking-requests_/$bookingRequestId_/offers_/$bookingRequestOfferId_/edit-configured-menu',
)({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            AdminBookingRequestOfferConfiguredMenuEditPageDocument,
            adminBookingRequestOfferConfiguredMenuEditPageVariables(params.bookingRequestId, params.bookingRequestOfferId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBookingRequestOfferConfiguredMenuEditPageTitle[locale],
            description: adminBookingRequestOfferConfiguredMenuEditPageDescription[locale],
            path: `/admin/booking-requests/${params.bookingRequestId}/offers/${params.bookingRequestOfferId}/edit-configured-menu`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId, bookingRequestOfferId } = Route.useParams();
        return (
            <AdminBookingRequestOfferConfiguredMenuEditPage
                data={Route.useLoaderData()}
                bookingRequestId={bookingRequestId}
                bookingRequestOfferId={bookingRequestOfferId}
            />
        );
    },
});
