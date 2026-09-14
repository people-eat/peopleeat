import { createFileRoute } from '@tanstack/react-router';

import { AdminLegalPage, adminLegalPageDescription, adminLegalPageTitle } from '../../../web/pages/admin/AdminLegalPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/legal')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminLegalPageTitle[locale],
            description: adminLegalPageDescription[locale],
            path: '/admin/legal',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: AdminLegalPage,
});
