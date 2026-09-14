import { createFileRoute, redirect } from '@tanstack/react-router';

import { featureToggleIsActive } from '../../../shared/featureToggle';
import { ChatPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileAssistantPage,
    profileAssistantPageDescription,
    profileAssistantPageTitle,
} from '../../../web/pages/profile/ProfileAssistantPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/assistant_/$chatId')({
    loader: async ({ params, parentMatchPromise }) => {
        const parent = await parentMatchPromise;
        const session = parent.loaderData?.currentSession;
        const isCook = Boolean(session?.user?.cook);
        const key = isCook ? 'ASSISTANT_COOK' : 'ASSISTANT_CUSTOMER';
        if (!featureToggleIsActive(session?.activeFeatureToggleKeys ?? [], key)) {
            throw redirect({ to: '/{-$locale}/profile', params: { locale: params.locale } });
        }
        await routeLoaderGraphqlClient(ChatPageDocument, { chatId: params.chatId })();
        return { isCook };
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileAssistantPageTitle[locale],
            description: profileAssistantPageDescription[locale],
            path: `/profile/assistant/${params.chatId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { chatId } = Route.useParams();
        const { isCook } = Route.useLoaderData();
        return <ProfileAssistantPage key={chatId} surface={isCook ? 'cook' : 'customer'} chatId={chatId} />;
    },
});
