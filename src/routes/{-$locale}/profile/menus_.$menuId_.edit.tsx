import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookMenuPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookMenuEditPage,
    profileCookMenuEditPageDescription,
    profileCookMenuEditPageTitle,
} from '../../../web/pages/profile/ProfileCookMenuEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';
import { parseSignInSearch } from '../../../web/utils/returnTo';

export const Route = createFileRoute('/{-$locale}/profile/menus_/$menuId_/edit')({
    validateSearch: (search: Record<string, unknown>) => parseSignInSearch(search),
    loader: ({ params }) => routeLoaderGraphqlClient(ProfileCookMenuPageDocument, { menuId: params.menuId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookMenuEditPageTitle[locale],
            description: profileCookMenuEditPageDescription[locale],
            path: `/profile/menus/${params.menuId}/edit`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { menuId } = Route.useParams();
        const { returnTo } = Route.useSearch();
        return <ProfileCookMenuEditPage key={menuId} data={Route.useLoaderData()} menuId={menuId} returnTo={returnTo} />;
    },
});
