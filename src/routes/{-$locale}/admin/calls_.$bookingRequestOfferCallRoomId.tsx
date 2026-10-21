import { createFileRoute } from '@tanstack/react-router';

import { AdminCallPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminCallPage,
    adminCallPageDescription,
    adminCallPageTitle,
    adminCallPageVariables,
} from '../../../web/pages/admin/AdminCallPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/calls_/$bookingRequestOfferCallRoomId')({
    loader: ({ params }) => routeLoaderGraphqlClient(AdminCallPageDocument, adminCallPageVariables(params.bookingRequestOfferCallRoomId))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminCallPageTitle[locale],
            description: adminCallPageDescription[locale],
            path: `/admin/calls/${params.bookingRequestOfferCallRoomId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestOfferCallRoomId } = Route.useParams();
        return <AdminCallPage data={Route.useLoaderData()} bookingRequestOfferCallRoomId={bookingRequestOfferCallRoomId} />;
    },
});
