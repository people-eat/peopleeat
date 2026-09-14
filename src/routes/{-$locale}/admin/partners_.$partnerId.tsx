import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminPartnerPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminPartnerPage,
    adminPartnerPageDescription,
    adminPartnerPageTitle,
    parseAdminPartnerPageSearch,
} from '../../../web/pages/admin/AdminPartnerPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/partners_/$partnerId')({
    validateSearch: (search: Record<string, unknown>) => parseAdminPartnerPageSearch(search),
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(AdminPartnerPageDocument, { partnerId: ctx.params.partnerId })();
        if (!data.currentSession.user?.admin?.partner) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminPartnerPageTitle[locale],
            description: adminPartnerPageDescription[locale],
            path: `/admin/partners/${params.partnerId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { partnerId } = Route.useParams();
        return <AdminPartnerPage data={Route.useLoaderData()} partnerId={partnerId} search={Route.useSearch()} />;
    },
});
