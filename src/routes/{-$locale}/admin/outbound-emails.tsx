import { createFileRoute } from '@tanstack/react-router';

import { AdminOutboundEmailsOverviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminOutboundEmailsOverviewPage,
    adminOutboundEmailsOverviewPageDescription,
    adminOutboundEmailsOverviewPageTitle,
    adminOutboundEmailsOverviewPageVariables,
} from '../../../web/pages/admin/AdminOutboundEmailsOverviewPage';
import { parseAdminOverviewRangeSearch } from '../../../web/pages/admin/adminOverviewRange';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/outbound-emails')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOverviewRangeSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) =>
        routeLoaderGraphqlClient(AdminOutboundEmailsOverviewPageDocument, adminOutboundEmailsOverviewPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminOutboundEmailsOverviewPageTitle[locale],
            description: adminOutboundEmailsOverviewPageDescription[locale],
            path: '/admin/outbound-emails',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminOutboundEmailsOverviewPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
