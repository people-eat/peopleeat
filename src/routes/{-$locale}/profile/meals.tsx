import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookMealsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    parseProfileMealsSearch,
    ProfileCookMealsPage,
    profileCookMealsPageDescription,
    profileCookMealsPageTitle,
} from '../../../web/pages/profile/ProfileCookMealsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/meals')({
    validateSearch: (search: Record<string, unknown>) => parseProfileMealsSearch(search),
    loader: routeLoaderGraphqlClient(ProfileCookMealsPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookMealsPageTitle[locale],
            description: profileCookMealsPageDescription[locale],
            path: '/profile/meals',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileCookMealsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
