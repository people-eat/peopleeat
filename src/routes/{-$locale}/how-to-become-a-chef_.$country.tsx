import { createFileRoute, notFound } from '@tanstack/react-router';

import { expansionMarketFromParam } from '../../shared/expansionMarkets';
import { ExpansionCountryPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { FoundingChefCountryPage } from '../../web/pages/FoundingChefCountryPage';
import { expansionMarketFoundingChefHead } from '../../web/seo/expansionMarketSeo';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/how-to-become-a-chef_/$country')({
    loader: async ({ params }) => {
        const market = expansionMarketFromParam(params.country);
        if (!market) {
            throw notFound();
        }
        const data = await routeLoaderGraphqlClient(ExpansionCountryPageDocument)();
        return { data, market };
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const market = loaderData?.market ?? expansionMarketFromParam(params.country);
        if (!market) {
            return {};
        }
        return expansionMarketFoundingChefHead(market, localeFromParam(params));
    },
    component() {
        const { data, market } = Route.useLoaderData();
        return <FoundingChefCountryPage data={data} market={market} />;
    },
});
