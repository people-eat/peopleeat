import { createFileRoute } from '@tanstack/react-router';

import { AdminBookingRequestPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminBookingRequestPage,
    adminBookingRequestPageDescription,
    adminBookingRequestPageTitle,
    adminBookingRequestPageVariables,
    parseAdminBookingRequestSearch,
} from '../../../web/pages/admin/AdminBookingRequestPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/booking-requests_/$bookingRequestId')({
    validateSearch: (search: Record<string, unknown>) => parseAdminBookingRequestSearch(search),
    loader: ({ params }) =>
        routeLoaderGraphqlClient(AdminBookingRequestPageDocument, adminBookingRequestPageVariables(params.bookingRequestId))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBookingRequestPageTitle[locale],
            description: adminBookingRequestPageDescription[locale],
            path: `/admin/booking-requests/${params.bookingRequestId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return (
            <AdminBookingRequestPage
                data={Route.useLoaderData()}
                search={Route.useSearch()}
                bookingRequestId={Route.useParams().bookingRequestId}
            />
        );
    },
});
