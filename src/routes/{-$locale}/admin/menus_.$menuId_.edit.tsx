import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminMenuEditPageDocument, AdminMenuPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminMenuEditPage,
    adminMenuEditPageDescription,
    adminMenuEditPageTitle,
    adminMenuEditPageVariables,
} from '../../../web/pages/admin/AdminMenuEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/menus_/$menuId_/edit')({
    loader: async (ctx) => {
        const menuId = ctx.params.menuId;
        const preview = await routeLoaderGraphqlClient(AdminMenuPageDocument, { menuId })();
        const menu = preview.currentSession.user?.admin?.cookMenu;
        if (!menu || menu.deletedAt != null) {
            throw notFound();
        }
        return routeLoaderGraphqlClient(AdminMenuEditPageDocument, adminMenuEditPageVariables(menuId, menu.cookId))();
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminMenuEditPageTitle[locale],
            description: adminMenuEditPageDescription[locale],
            path: `/admin/menus/${params.menuId}/edit`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { menuId } = Route.useParams();
        const data = Route.useLoaderData();
        const cookId = data.currentSession.user?.admin?.cookMenu?.cookId;
        if (!cookId) throw notFound();
        return <AdminMenuEditPage key={menuId} data={data} menuId={menuId} cookId={cookId} />;
    },
});
