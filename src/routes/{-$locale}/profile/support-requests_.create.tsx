import { createFileRoute } from '@tanstack/react-router';

import { ProfileCustomerSupportRequestsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileCustomerSupportRequestCreateSearch,
    ProfileCustomerSupportRequestCreatePage,
    profileCustomerSupportRequestCreatePageDescription,
    profileCustomerSupportRequestCreatePageTitle,
} from '../../../web/pages/profile/ProfileCustomerSupportRequestCreatePage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/support-requests_/create')({
    validateSearch: (search: Record<string, unknown>) => parseProfileCustomerSupportRequestCreateSearch(search),
    loader: routeLoaderGraphqlClient(ProfileCustomerSupportRequestsPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCustomerSupportRequestCreatePageTitle[locale],
            description: profileCustomerSupportRequestCreatePageDescription[locale],
            path: '/profile/support-requests/create',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const search = Route.useSearch();
        return <ProfileCustomerSupportRequestCreatePage data={Route.useLoaderData()} search={search} />;
    },
});
