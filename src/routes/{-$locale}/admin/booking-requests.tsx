import { createFileRoute } from '@tanstack/react-router';

import { AdminBookingRequestsOverviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminBookingRequestsOverviewPage,
    adminBookingRequestsOverviewPageDescription,
    adminBookingRequestsOverviewPageTitle,
    adminBookingRequestsOverviewPageVariables,
} from '../../../web/pages/admin/AdminBookingRequestsOverviewPage';
import { parseAdminOverviewRangeSearch } from '../../../web/pages/admin/adminOverviewRange';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/booking-requests')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOverviewRangeSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) =>
        routeLoaderGraphqlClient(AdminBookingRequestsOverviewPageDocument, adminBookingRequestsOverviewPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBookingRequestsOverviewPageTitle[locale],
            description: adminBookingRequestsOverviewPageDescription[locale],
            path: '/admin/booking-requests',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminBookingRequestsOverviewPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
