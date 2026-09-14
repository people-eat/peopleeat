import { createFileRoute, notFound } from '@tanstack/react-router';

import type { GqlCWebPageKey } from '../../../web/graphql/generated';
import { AdminWebPagePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminWebPagePage, adminWebPagePageDescription, adminWebPagePageTitle } from '../../../web/pages/admin/AdminWebPagePage';
import { parseAdminWebPageKey } from '../../../web/pages/admin/adminWebPages';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/web-pages_/$webPageKey')({
    loader: async (ctx) => {
        const webPageKey = parseAdminWebPageKey(ctx.params.webPageKey);
        if (!webPageKey) {
            throw notFound();
        }
        return routeLoaderGraphqlClient(AdminWebPagePageDocument, { webPageKey })();
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminWebPagePageTitle[locale],
            description: adminWebPagePageDescription[locale],
            path: `/admin/web-pages/${params.webPageKey}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const webPageKey = Route.useParams().webPageKey as GqlCWebPageKey;
        return <AdminWebPagePage data={Route.useLoaderData()} webPageKey={webPageKey} />;
    },
});
