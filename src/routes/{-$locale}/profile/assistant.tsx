import { createFileRoute, redirect } from '@tanstack/react-router';

import { featureToggleIsActive } from '../../../shared/featureToggle';
import {
    ProfileAssistantPage,
    profileAssistantPageDescription,
    profileAssistantPageTitle,
} from '../../../web/pages/profile/ProfileAssistantPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/assistant')({
    loader: async ({ parentMatchPromise, params }) => {
        const parent = await parentMatchPromise;
        const session = parent.loaderData?.currentSession;
        const isCook = Boolean(session?.user?.cook);
        const key = isCook ? 'ASSISTANT_COOK' : 'ASSISTANT_CUSTOMER';
        if (!featureToggleIsActive(session?.activeFeatureToggleKeys ?? [], key)) {
            throw redirect({ to: '/{-$locale}/profile', params: { locale: params.locale } });
        }
        return { isCook };
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileAssistantPageTitle[locale],
            description: profileAssistantPageDescription[locale],
            path: '/profile/assistant',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { isCook } = Route.useLoaderData();
        return <ProfileAssistantPage surface={isCook ? 'cook' : 'customer'} />;
    },
});
