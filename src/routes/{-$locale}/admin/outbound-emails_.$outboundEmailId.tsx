import { createFileRoute } from '@tanstack/react-router';

import { AdminOutboundEmailPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminOutboundEmailPage,
    adminOutboundEmailPageDescription,
    adminOutboundEmailPageTitle,
} from '../../../web/pages/admin/AdminOutboundEmailPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/outbound-emails_/$outboundEmailId')({
    loader: ({ params }) => routeLoaderGraphqlClient(AdminOutboundEmailPageDocument, { outboundEmailId: params.outboundEmailId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminOutboundEmailPageTitle[locale],
            description: adminOutboundEmailPageDescription[locale],
            path: `/admin/outbound-emails/${params.outboundEmailId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminOutboundEmailPage data={Route.useLoaderData()} />;
    },
});
