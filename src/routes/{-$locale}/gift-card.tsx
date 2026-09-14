import { createFileRoute } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { GiftCardPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { GiftCardPage, parseGiftCardFormSearch } from '../../web/pages/GiftCardPage';
import { recaptchaSiteKeyGet } from '../../web/seo/recaptchaSiteKeyGet';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/gift-card')({
    validateSearch: (search: Record<string, unknown>) => parseGiftCardFormSearch(search),
    loader: async () => {
        const data = await routeLoaderGraphqlClient(GiftCardPageDocument)();
        return { data, recaptchaSiteKey: recaptchaSiteKeyGet() };
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const webPage = loaderData?.data.publicWebPage.findOne;
        if (!webPage) {
            return {};
        }
        return seoMeta({
            title: contentLocaleText(webPage.titleDe, webPage.titleEn, locale),
            description: contentLocaleText(webPage.descriptionDe, webPage.descriptionEn, locale),
            path: '/gift-card',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <GiftCardPage loaderData={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
