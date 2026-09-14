import { createFileRoute } from '@tanstack/react-router';

import { ProfileCookMealPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookMealEditPage,
    profileCookMealEditPageDescription,
    profileCookMealEditPageTitle,
} from '../../../web/pages/profile/ProfileCookMealEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/meals_/$mealId_/edit')({
    loader: ({ params }) => routeLoaderGraphqlClient(ProfileCookMealPageDocument, { mealId: params.mealId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookMealEditPageTitle[locale],
            description: profileCookMealEditPageDescription[locale],
            path: `/profile/meals/${params.mealId}/edit`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { mealId } = Route.useParams();
        return <ProfileCookMealEditPage key={mealId} data={Route.useLoaderData()} mealId={mealId} />;
    },
});
