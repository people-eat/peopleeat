import { createFileRoute } from '@tanstack/react-router';

import { AdminSessionPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminSessionPage,
    adminSessionPageDescription,
    adminSessionPageTitle,
    adminSessionPageVariables,
    parseAdminSessionSearch,
} from '../../../web/pages/admin/AdminSessionPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/sessions_/$sessionId')({
    validateSearch: (search: Record<string, unknown>) => parseAdminSessionSearch(search),
    loaderDeps: ({ search }) => ({
        tab: search.tab,
        page: search.tab === 'events' ? search.page : undefined,
        pageSize: search.tab === 'events' ? search.pageSize : undefined,
    }),
    loader: ({ params, deps }) =>
        routeLoaderGraphqlClient(
            AdminSessionPageDocument,
            adminSessionPageVariables(params.sessionId, {
                tab: deps.tab,
                page: deps.page,
                pageSize: deps.pageSize,
            }),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminSessionPageTitle[locale],
            description: adminSessionPageDescription[locale],
            path: `/admin/sessions/${params.sessionId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminSessionPage data={Route.useLoaderData()} search={Route.useSearch()} sessionId={Route.useParams().sessionId} />;
    },
});
