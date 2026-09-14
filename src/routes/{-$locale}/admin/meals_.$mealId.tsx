import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminMealPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminMealPage, adminMealPageDescription, adminMealPageTitle } from '../../../web/pages/admin/AdminMealPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/meals_/$mealId')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(AdminMealPageDocument, { mealId: ctx.params.mealId })();
        if (!data.currentSession.user?.admin?.cookMeal) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminMealPageTitle[locale],
            description: adminMealPageDescription[locale],
            path: `/admin/meals/${params.mealId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { mealId } = Route.useParams();
        return <AdminMealPage key={mealId} data={Route.useLoaderData()} mealId={mealId} />;
    },
});
