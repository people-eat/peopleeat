import { createFileRoute } from '@tanstack/react-router';

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
            title: { de: 'Gutschein bezahlen', en: 'Pay for gift card' }[locale],
            description: {
                de: 'Schließe die Zahlung für deinen peopleeat-Gutschein ab.',
                en: 'Complete payment for your peopleeat gift card.',
            }[locale],
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
