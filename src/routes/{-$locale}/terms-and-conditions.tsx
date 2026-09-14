import { createFileRoute } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { PublicLegalDocumentsDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { TermsAndConditionsPage } from '../../web/pages/TermsAndConditionsPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/terms-and-conditions')({
    loader: () => routeLoaderGraphqlClient(PublicLegalDocumentsDocument, { webPageKey: 'TERMS_AND_CONDITIONS' })(),
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
            path: '/terms-and-conditions',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <TermsAndConditionsPage data={Route.useLoaderData()} />;
    },
});
