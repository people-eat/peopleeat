import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminPartnerVenuePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminPartnerVenuePage,
    adminPartnerVenuePageDescription,
    adminPartnerVenuePageTitle,
    parseAdminPartnerVenuePageSearch,
} from '../../../web/pages/admin/AdminPartnerVenuePage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/partner-venues_/$partnerVenueId')({
    validateSearch: (search: Record<string, unknown>) => parseAdminPartnerVenuePageSearch(search),
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(AdminPartnerVenuePageDocument, {
            partnerVenueId: ctx.params.partnerVenueId,
        })();
        if (!data.currentSession.user?.admin?.partnerVenue) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminPartnerVenuePageTitle[locale],
            description: adminPartnerVenuePageDescription[locale],
            path: `/admin/partner-venues/${params.partnerVenueId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { partnerVenueId } = Route.useParams();
        return <AdminPartnerVenuePage data={Route.useLoaderData()} partnerVenueId={partnerVenueId} search={Route.useSearch()} />;
    },
});
