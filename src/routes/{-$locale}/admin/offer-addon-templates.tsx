import { createFileRoute } from '@tanstack/react-router';

import { AdminOfferAddonTemplatesPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminOfferAddonTemplatesPage,
    adminOfferAddonTemplatesPageDescription,
    adminOfferAddonTemplatesPageTitle,
} from '../../../web/pages/admin/AdminOfferAddonTemplatesPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/offer-addon-templates')({
    // Blocking: the edit page unmounts this list, so a delete misses adminUpdates.
    // Do not remount on the pre-mutation snapshot. See state-synchronization.md.
    loader: {
        handler: routeLoaderGraphqlClient(AdminOfferAddonTemplatesPageDocument),
        staleReloadMode: 'blocking',
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminOfferAddonTemplatesPageTitle[locale],
            description: adminOfferAddonTemplatesPageDescription[locale],
            path: '/admin/offer-addon-templates',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminOfferAddonTemplatesPage data={Route.useLoaderData()} />;
    },
});
