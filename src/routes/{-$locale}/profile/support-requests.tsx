import { createFileRoute } from '@tanstack/react-router';

import { ProfileCustomerSupportRequestsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCustomerSupportRequestsPage,
    profileCustomerSupportRequestsPageDescription,
    profileCustomerSupportRequestsPageTitle,
} from '../../../web/pages/profile/ProfileCustomerSupportRequestsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/support-requests')({
    loader: routeLoaderGraphqlClient(ProfileCustomerSupportRequestsPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCustomerSupportRequestsPageTitle[locale],
            description: profileCustomerSupportRequestsPageDescription[locale],
            path: '/profile/support-requests',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCustomerSupportRequestsPage data={Route.useLoaderData()} />;
    },
});
