import { createFileRoute } from '@tanstack/react-router';

import {
    AdminPromoCodeCreatePage,
    adminPromoCodeCreatePageDescription,
    adminPromoCodeCreatePageTitle,
} from '../../../web/pages/admin/AdminPromoCodeCreatePage';
import { adminPromoCodesSectionPath } from '../../../web/pages/admin/adminPromoCodes';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/promo-codes_/create')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminPromoCodeCreatePageTitle[locale],
            description: adminPromoCodeCreatePageDescription[locale],
            path: adminPromoCodesSectionPath('create'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: AdminPromoCodeCreatePage,
});
