import { createFileRoute } from '@tanstack/react-router';

import { AdminBookingRequestOfferEditPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminBookingRequestOfferEditPage,
    adminBookingRequestOfferEditPageDescription,
    adminBookingRequestOfferEditPageTitle,
    adminBookingRequestOfferEditPageVariables,
} from '../../../web/pages/admin/AdminBookingRequestOfferEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/booking-requests_/$bookingRequestId_/offers_/$bookingRequestOfferId_/edit')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            AdminBookingRequestOfferEditPageDocument,
            adminBookingRequestOfferEditPageVariables(params.bookingRequestId, params.bookingRequestOfferId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBookingRequestOfferEditPageTitle[locale],
            description: adminBookingRequestOfferEditPageDescription[locale],
            path: `/admin/booking-requests/${params.bookingRequestId}/offers/${params.bookingRequestOfferId}/edit`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId, bookingRequestOfferId } = Route.useParams();
        return (
            <AdminBookingRequestOfferEditPage
                data={Route.useLoaderData()}
                bookingRequestId={bookingRequestId}
                bookingRequestOfferId={bookingRequestOfferId}
            />
        );
    },
});
