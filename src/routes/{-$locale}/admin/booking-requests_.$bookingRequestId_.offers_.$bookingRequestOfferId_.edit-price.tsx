import { createFileRoute } from '@tanstack/react-router';

import { AdminBookingRequestOfferPriceEditPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminBookingRequestOfferPriceEditPage,
    adminBookingRequestOfferPriceEditPageDescription,
    adminBookingRequestOfferPriceEditPageTitle,
    adminBookingRequestOfferPriceEditPageVariables,
} from '../../../web/pages/admin/AdminBookingRequestOfferPriceEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/booking-requests_/$bookingRequestId_/offers_/$bookingRequestOfferId_/edit-price')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            AdminBookingRequestOfferPriceEditPageDocument,
            adminBookingRequestOfferPriceEditPageVariables(params.bookingRequestId, params.bookingRequestOfferId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBookingRequestOfferPriceEditPageTitle[locale],
            description: adminBookingRequestOfferPriceEditPageDescription[locale],
            path: `/admin/booking-requests/${params.bookingRequestId}/offers/${params.bookingRequestOfferId}/edit-price`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId, bookingRequestOfferId } = Route.useParams();
        return (
            <AdminBookingRequestOfferPriceEditPage
                data={Route.useLoaderData()}
                bookingRequestId={bookingRequestId}
                bookingRequestOfferId={bookingRequestOfferId}
            />
        );
    },
});
