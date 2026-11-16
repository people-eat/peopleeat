import { createFileRoute } from '@tanstack/react-router';

import { GiftCardPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { GiftCardPage, parseGiftCardFormSearch } from '../../web/pages/GiftCardPage';
import { recaptchaSiteKeyGet } from '../../web/seo/recaptchaSiteKeyGet';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
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
        const { title, description } = webPageSeoText(locale, webPage, 'giftCard');
        return seoMeta({
            title,
            description,
            path: '/gift-card',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <GiftCardPage loaderData={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
