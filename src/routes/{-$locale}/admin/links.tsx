import { createFileRoute } from '@tanstack/react-router';

import { AdminLinksPage, adminLinksPageDescription, adminLinksPageTitle } from '../../../web/pages/admin/AdminLinksPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/links')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminLinksPageTitle[locale],
            description: adminLinksPageDescription[locale],
            path: '/admin/links',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: AdminLinksPage,
});
