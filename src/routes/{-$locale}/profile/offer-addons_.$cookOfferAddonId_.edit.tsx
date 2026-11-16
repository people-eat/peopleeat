import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookOfferAddonEditPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookOfferAddonEditPage,
    profileCookOfferAddonEditPageDescription,
    profileCookOfferAddonEditPageTitle,
} from '../../../web/pages/profile/ProfileCookOfferAddonEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/offer-addons_/$cookOfferAddonId_/edit')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(ProfileCookOfferAddonEditPageDocument, { cookOfferAddonId: params.cookOfferAddonId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookOfferAddonEditPageTitle(locale),
            description: profileCookOfferAddonEditPageDescription(locale),
            path: `/profile/offer-addons/${params.cookOfferAddonId}/edit`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { cookOfferAddonId } = Route.useParams();
        return <ProfileCookOfferAddonEditPage key={cookOfferAddonId} data={Route.useLoaderData()} cookOfferAddonId={cookOfferAddonId} />;
    },
});
