import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookWalletPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileWalletSearch,
    ProfileCookWalletPage,
    profileCookWalletPageDescription,
    profileCookWalletPageTitle,
} from '../../../web/pages/profile/ProfileCookWalletPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/wallet')({
    validateSearch: (search: Record<string, unknown>) => parseProfileWalletSearch(search),
    loader: routeLoaderGraphqlClient(ProfileCookWalletPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookWalletPageTitle[locale],
            description: profileCookWalletPageDescription[locale],
            path: '/profile/wallet',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookWalletPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
