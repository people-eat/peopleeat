import { createFileRoute } from '@tanstack/react-router';

import { t } from '../../i18n/t';
import { GiftCardCheckoutPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { GiftCardCheckoutPage } from '../../web/pages/GiftCardCheckoutPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/gift-card_/$giftCardId_/checkout')({
    loader: async () => {
        const data = await routeLoaderGraphqlClient(GiftCardCheckoutPageDocument)();
        return { data };
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: t(locale, 'public', 'giftCard.checkout.seoTitle'),
            description: t(locale, 'public', 'giftCard.checkout.seoDescription'),
            path: `/gift-card/${params.giftCardId}/checkout`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { giftCardId } = Route.useParams();
        return <GiftCardCheckoutPage loaderData={Route.useLoaderData()} giftCardId={giftCardId} />;
    },
});
