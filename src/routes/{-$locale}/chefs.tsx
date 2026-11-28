import { createFileRoute } from '@tanstack/react-router';

import { ChefsPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { ChefsPage, chefsPageVariables, parseChefsSearch } from '../../web/pages/ChefsPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/chefs')({
    validateSearch: (search: Record<string, unknown>) => parseChefsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(ChefsPageDocument, chefsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const webPage = loaderData?.publicWebPage.findOne;
        if (!webPage) {
            return {};
        }
        return seoMeta({
            title: webPageSeoText(locale, webPage).title,
            description: webPageSeoText(locale, webPage).description,
            path: '/chefs',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <ChefsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
