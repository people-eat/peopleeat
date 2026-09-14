import { createFileRoute } from '@tanstack/react-router';

import { AdminBookingRequestOfferPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminBookingRequestOfferPage,
    adminBookingRequestOfferPageDescription,
    adminBookingRequestOfferPageTitle,
    adminBookingRequestOfferPageVariables,
    parseAdminBookingRequestOfferSearch,
} from '../../../web/pages/admin/AdminBookingRequestOfferPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/booking-requests_/$bookingRequestId_/offers_/$bookingRequestOfferId')({
    validateSearch: (search: Record<string, unknown>) => parseAdminBookingRequestOfferSearch(search),
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            AdminBookingRequestOfferPageDocument,
            adminBookingRequestOfferPageVariables(params.bookingRequestId, params.bookingRequestOfferId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBookingRequestOfferPageTitle[locale],
            description: adminBookingRequestOfferPageDescription[locale],
            path: `/admin/booking-requests/${params.bookingRequestId}/offers/${params.bookingRequestOfferId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId, bookingRequestOfferId } = Route.useParams();
        return (
            <AdminBookingRequestOfferPage
                data={Route.useLoaderData()}
                search={Route.useSearch()}
                bookingRequestId={bookingRequestId}
                bookingRequestOfferId={bookingRequestOfferId}
            />
        );
    },
});
