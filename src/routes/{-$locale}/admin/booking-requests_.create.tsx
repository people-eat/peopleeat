import { createFileRoute } from '@tanstack/react-router';

import {
    AdminBookingRequestCreatePage,
    adminBookingRequestCreatePageDescription,
    adminBookingRequestCreatePageTitle,
    parseAdminBookingRequestCreateSearch,
} from '../../../web/pages/admin/AdminBookingRequestCreatePage';
import { adminBookingRequestsSectionPath } from '../../../web/pages/admin/adminBookingRequests';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/booking-requests_/create')({
    validateSearch: (search: Record<string, unknown>) => parseAdminBookingRequestCreateSearch(search),
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBookingRequestCreatePageTitle[locale],
            description: adminBookingRequestCreatePageDescription[locale],
            path: adminBookingRequestsSectionPath('create'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: AdminBookingRequestCreateRoute,
});

function AdminBookingRequestCreateRoute() {
    return <AdminBookingRequestCreatePage search={Route.useSearch()} />;
}
