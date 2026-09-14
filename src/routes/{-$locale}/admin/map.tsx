import { createFileRoute } from '@tanstack/react-router';

import { AdminMapPage, adminMapPageDescription, adminMapPageTitle } from '../../../web/pages/admin/AdminMapPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/map')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminMapPageTitle[locale],
            description: adminMapPageDescription[locale],
            path: '/admin/map',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: AdminMapPage,
});
