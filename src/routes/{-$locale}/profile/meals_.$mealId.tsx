import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookMealPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookMealPage,
    profileCookMealPageDescription,
    profileCookMealPageTitle,
} from '../../../web/pages/profile/ProfileCookMealPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/meals_/$mealId')({
    loader: ({ params }) => routeLoaderGraphqlClient(ProfileCookMealPageDocument, { mealId: params.mealId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookMealPageTitle[locale],
            description: profileCookMealPageDescription[locale],
            path: `/profile/meals/${params.mealId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { mealId } = Route.useParams();
        return <ProfileCookMealPage key={mealId} data={Route.useLoaderData()} mealId={mealId} />;
    },
});
