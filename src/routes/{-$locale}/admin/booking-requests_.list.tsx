import { createFileRoute } from '@tanstack/react-router';

import { AdminBookingRequestsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminBookingRequestsSectionPath } from '../../../web/pages/admin/adminBookingRequests';
import {
    AdminBookingRequestsPage,
    adminBookingRequestsPageDescription,
    adminBookingRequestsPageTitle,
    adminBookingRequestsPageVariables,
    parseAdminBookingRequestsSearch,
} from '../../../web/pages/admin/AdminBookingRequestsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/booking-requests_/list')({
    validateSearch: (search: Record<string, unknown>) => parseAdminBookingRequestsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminBookingRequestsPageDocument, adminBookingRequestsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBookingRequestsPageTitle[locale],
            description: adminBookingRequestsPageDescription[locale],
            path: adminBookingRequestsSectionPath('list'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminBookingRequestsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
