import { createFileRoute } from '@tanstack/react-router';

import {
    AdminUserCreatePage,
    adminUserCreatePageDescription,
    adminUserCreatePageTitle,
} from '../../../web/pages/admin/AdminUserCreatePage';
import { adminUsersSectionPath } from '../../../web/pages/admin/adminUsers';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/users_/create')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminUserCreatePageTitle[locale],
            description: adminUserCreatePageDescription[locale],
            path: adminUsersSectionPath('create'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: AdminUserCreatePage,
});
