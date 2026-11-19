import { createFileRoute, notFound } from '@tanstack/react-router';

import { expansionMarketFromParam } from '../../shared/expansionMarkets';
import { ExpansionCountryPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { ComingToCountryPage } from '../../web/pages/ComingToCountryPage';
import { expansionMarketComingToHead } from '../../web/seo/expansionMarketSeo';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/coming-to_/$country')({
    loader: async ({ params }) => {
        const market = expansionMarketFromParam(params.country);
        if (!market) {
            throw notFound();
        }
        const data = await routeLoaderGraphqlClient(ExpansionCountryPageDocument, { countryCode: market.countryCode })();
        return { data, market };
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const market = loaderData?.market ?? expansionMarketFromParam(params.country);
        if (!market) {
            return {};
        }
        return expansionMarketComingToHead(market, localeFromParam(params), loaderData?.data.publicCity.findMany ?? []);
    },
    component() {
        const { data, market } = Route.useLoaderData();
        return <ComingToCountryPage data={data} market={market} />;
    },
});
