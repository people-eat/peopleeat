import { createFileRoute } from '@tanstack/react-router';

import { AdminPathPageChrome } from '../../../web/components/AdminPageChrome';
import { AccountPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AccountPage, accountPageDescription, accountPageTitle } from '../../../web/pages/AccountPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/account')({
    loader: routeLoaderGraphqlClient(AccountPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: accountPageTitle[locale],
            description: accountPageDescription[locale],
            path: '/admin/account',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return (
            <AdminPathPageChrome>
                <AccountPage loaderData={Route.useLoaderData()} />
            </AdminPathPageChrome>
        );
    },
});
