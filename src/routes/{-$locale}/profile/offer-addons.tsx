import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookOfferAddonsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileOfferAddonsSearch,
    ProfileCookOfferAddonsPage,
    profileCookOfferAddonsPageDescription,
    profileCookOfferAddonsPageTitle,
} from '../../../web/pages/profile/ProfileCookOfferAddonsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/offer-addons')({
    validateSearch: (search: Record<string, unknown>) => parseProfileOfferAddonsSearch(search),
    // Blocking: edit unmounts this list, so save/delete miss userUpdates.
    // Do not remount on the pre-mutation snapshot. See state-synchronization.md.
    loader: {
        handler: routeLoaderGraphqlClient(ProfileCookOfferAddonsPageDocument),
        staleReloadMode: 'blocking',
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookOfferAddonsPageTitle(locale),
            description: profileCookOfferAddonsPageDescription(locale),
            path: '/profile/offer-addons',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookOfferAddonsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
