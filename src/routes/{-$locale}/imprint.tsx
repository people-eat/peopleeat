import { createFileRoute } from '@tanstack/react-router';

import { PublicLegalDocumentsDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { ImprintPage } from '../../web/pages/ImprintPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/imprint')({
    loader: () => routeLoaderGraphqlClient(PublicLegalDocumentsDocument, { webPageKey: 'IMPRINT' })(),
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
            path: '/imprint',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <ImprintPage data={Route.useLoaderData()} />;
    },
});
