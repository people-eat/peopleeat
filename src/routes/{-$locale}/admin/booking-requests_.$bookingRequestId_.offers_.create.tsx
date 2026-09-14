import { createFileRoute } from '@tanstack/react-router';

import { AdminBookingRequestOfferCreatePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminBookingRequestOfferCreatePage,
    adminBookingRequestOfferCreatePageDescription,
    adminBookingRequestOfferCreatePageTitle,
    adminBookingRequestOfferCreatePageVariables,
    parseAdminBookingRequestOfferCreateSearch,
} from '../../../web/pages/admin/AdminBookingRequestOfferCreatePage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/booking-requests_/$bookingRequestId_/offers_/create')({
    validateSearch: (search: Record<string, unknown>) => parseAdminBookingRequestOfferCreateSearch(search),
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            AdminBookingRequestOfferCreatePageDocument,
            adminBookingRequestOfferCreatePageVariables(params.bookingRequestId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBookingRequestOfferCreatePageTitle[locale],
            description: adminBookingRequestOfferCreatePageDescription[locale],
            path: `/admin/booking-requests/${params.bookingRequestId}/offers/create`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId } = Route.useParams();
        return (
            <AdminBookingRequestOfferCreatePage
                data={Route.useLoaderData()}
                bookingRequestId={bookingRequestId}
                search={Route.useSearch()}
            />
        );
    },
});
