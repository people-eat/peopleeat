import { createFileRoute, notFound } from '@tanstack/react-router';

import { ChefPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { ChefPage } from '../../web/pages/ChefPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/chefs_/$cookId')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(ChefPageDocument, {
            cookId: ctx.params.cookId,
        })();
        if (!data.publicCook.findOne) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const cook = loaderData?.publicCook.findOne;
        if (!cook) {
            return {};
        }
        const name = cook.user.display;
        const summary = cook.biographySummary.trim();
        return seoMeta({
            title: name,
            description:
                summary.length > 0
                    ? summary
                    : {
                          de: `${name}, Privatkoch bei peopleeat.`,
                          en: `${name}, private chef on peopleeat.`,
                      }[locale],
            path: `/chefs/${cook.cookId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            image: cook.user.profilePicture?.url ?? undefined,
        });
    },
    component() {
        return <ChefPage data={Route.useLoaderData()} />;
    },
});
