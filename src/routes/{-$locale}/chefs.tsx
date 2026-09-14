import { createFileRoute } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { ChefsPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { ChefsPage, chefsPageVariables, parseChefsSearch } from '../../web/pages/ChefsPage';
import { seoMeta } from '../../web/seo/seoMeta';
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
            title: contentLocaleText(webPage.titleDe, webPage.titleEn, locale),
            description: contentLocaleText(webPage.descriptionDe, webPage.descriptionEn, locale),
            path: '/chefs',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <ChefsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
