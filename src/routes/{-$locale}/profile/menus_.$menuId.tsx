import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookMenuPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookMenuPage,
    profileCookMenuPageDescription,
    profileCookMenuPageTitle,
} from '../../../web/pages/profile/ProfileCookMenuPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/menus_/$menuId')({
    loader: ({ params }) => routeLoaderGraphqlClient(ProfileCookMenuPageDocument, { menuId: params.menuId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookMenuPageTitle[locale],
            description: profileCookMenuPageDescription[locale],
            path: `/profile/menus/${params.menuId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { menuId } = Route.useParams();
        return <ProfileCookMenuPage key={menuId} data={Route.useLoaderData()} menuId={menuId} />;
    },
});
