import { createFileRoute } from '@tanstack/react-router';

import { AdminOutboundEmailsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminOutboundEmailsSectionPath } from '../../../web/pages/admin/adminOutboundEmails';
import {
    AdminOutboundEmailsPage,
    adminOutboundEmailsPageDescription,
    adminOutboundEmailsPageTitle,
    adminOutboundEmailsPageVariables,
    parseAdminOutboundEmailsSearch,
} from '../../../web/pages/admin/AdminOutboundEmailsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/outbound-emails_/list')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOutboundEmailsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminOutboundEmailsPageDocument, adminOutboundEmailsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminOutboundEmailsPageTitle[locale],
            description: adminOutboundEmailsPageDescription[locale],
            path: adminOutboundEmailsSectionPath('list'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminOutboundEmailsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
