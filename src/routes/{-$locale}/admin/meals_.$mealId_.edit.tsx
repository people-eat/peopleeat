import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminMealPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminMealEditPage, adminMealEditPageDescription, adminMealEditPageTitle } from '../../../web/pages/admin/AdminMealEditPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/meals_/$mealId_/edit')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(AdminMealPageDocument, { mealId: ctx.params.mealId })();
        const meal = data.currentSession.user?.admin?.cookMeal;
        if (!meal || meal.deletedAt != null) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminMealEditPageTitle[locale],
            description: adminMealEditPageDescription[locale],
            path: `/admin/meals/${params.mealId}/edit`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { mealId } = Route.useParams();
        return <AdminMealEditPage key={mealId} data={Route.useLoaderData()} mealId={mealId} />;
    },
});
