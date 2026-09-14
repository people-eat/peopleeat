import { createFileRoute } from '@tanstack/react-router';

import { AdminBookingRequestEditPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminBookingRequestEditPage,
    adminBookingRequestEditPageDescription,
    adminBookingRequestEditPageTitle,
    adminBookingRequestEditPageVariables,
} from '../../../web/pages/admin/AdminBookingRequestEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/booking-requests_/$bookingRequestId_/edit')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(AdminBookingRequestEditPageDocument, adminBookingRequestEditPageVariables(params.bookingRequestId))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBookingRequestEditPageTitle[locale],
            description: adminBookingRequestEditPageDescription[locale],
            path: `/admin/booking-requests/${params.bookingRequestId}/edit`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId } = Route.useParams();
        return <AdminBookingRequestEditPage data={Route.useLoaderData()} bookingRequestId={bookingRequestId} />;
    },
});
