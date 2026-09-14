import { createFileRoute } from '@tanstack/react-router';

import { ProfileGiftCardsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileGiftCardsPage,
    profileGiftCardsPageDescription,
    profileGiftCardsPageTitle,
} from '../../../web/pages/profile/ProfileGiftCardsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/gift-cards')({
    loader: routeLoaderGraphqlClient(ProfileGiftCardsPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileGiftCardsPageTitle[locale],
            description: profileGiftCardsPageDescription[locale],
            path: '/profile/gift-cards',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileGiftCardsPage data={Route.useLoaderData()} />;
    },
});
