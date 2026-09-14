import { createFileRoute } from '@tanstack/react-router';

import { AdminWhatsAppChatsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminWhatsAppChatsPage,
    adminWhatsAppChatsPageDescription,
    adminWhatsAppChatsPageTitle,
    adminWhatsAppChatsPageVariables,
    parseAdminWhatsAppChatsSearch,
} from '../../../web/pages/admin/AdminWhatsAppChatsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/whats-app-chats')({
    validateSearch: (search: Record<string, unknown>) => parseAdminWhatsAppChatsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminWhatsAppChatsPageDocument, adminWhatsAppChatsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminWhatsAppChatsPageTitle[locale],
            description: adminWhatsAppChatsPageDescription[locale],
            path: '/admin/whats-app-chats',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminWhatsAppChatsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
