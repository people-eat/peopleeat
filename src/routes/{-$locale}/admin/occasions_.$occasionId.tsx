import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminOccasionPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminOccasionPage,
    adminOccasionPageDescription,
    adminOccasionPageTitle,
    parseAdminOccasionPageSearch,
} from '../../../web/pages/admin/AdminOccasionPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/occasions_/$occasionId')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOccasionPageSearch(search),
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(AdminOccasionPageDocument, { occasionId: ctx.params.occasionId })();
        if (!data.currentSession.user?.admin?.occasion) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminOccasionPageTitle[locale],
            description: adminOccasionPageDescription[locale],
            path: `/admin/occasions/${params.occasionId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { occasionId } = Route.useParams();
        return <AdminOccasionPage data={Route.useLoaderData()} occasionId={occasionId} search={Route.useSearch()} />;
    },
});
