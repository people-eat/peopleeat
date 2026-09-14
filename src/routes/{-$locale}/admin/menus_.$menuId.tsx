import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminMenuPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminMenuPage, adminMenuPageDescription, adminMenuPageTitle } from '../../../web/pages/admin/AdminMenuPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/menus_/$menuId')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(AdminMenuPageDocument, { menuId: ctx.params.menuId })();
        if (!data.currentSession.user?.admin?.cookMenu) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminMenuPageTitle[locale],
            description: adminMenuPageDescription[locale],
            path: `/admin/menus/${params.menuId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { menuId } = Route.useParams();
        return <AdminMenuPage key={menuId} data={Route.useLoaderData()} menuId={menuId} />;
    },
});
