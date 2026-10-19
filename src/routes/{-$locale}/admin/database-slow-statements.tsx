import { createFileRoute } from '@tanstack/react-router';

import { AdminDatabaseSlowStatementsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminDatabaseSlowStatementsPage,
    adminDatabaseSlowStatementsPageDescription,
    adminDatabaseSlowStatementsPageTitle,
    adminDatabaseSlowStatementsPageVariables,
} from '../../../web/pages/admin/AdminDatabaseSlowStatementsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/database-slow-statements')({
    loader: routeLoaderGraphqlClient(AdminDatabaseSlowStatementsPageDocument, adminDatabaseSlowStatementsPageVariables()),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminDatabaseSlowStatementsPageTitle[locale],
            description: adminDatabaseSlowStatementsPageDescription[locale],
            path: '/admin/database-slow-statements',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminDatabaseSlowStatementsPage data={Route.useLoaderData()} />;
    },
});
