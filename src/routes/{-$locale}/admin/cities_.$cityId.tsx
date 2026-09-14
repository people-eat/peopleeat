import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminCityPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminCityPage,
    adminCityPageDescription,
    adminCityPageTitle,
    parseAdminCityPageSearch,
} from '../../../web/pages/admin/AdminCityPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/cities_/$cityId')({
    validateSearch: (search: Record<string, unknown>) => parseAdminCityPageSearch(search),
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(AdminCityPageDocument, { cityId: ctx.params.cityId })();
        if (!data.currentSession.user?.admin?.city) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminCityPageTitle[locale],
            description: adminCityPageDescription[locale],
            path: `/admin/cities/${params.cityId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { cityId } = Route.useParams();
        return <AdminCityPage data={Route.useLoaderData()} cityId={cityId} search={Route.useSearch()} />;
    },
});
