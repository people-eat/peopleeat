import { createFileRoute, redirect } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { ProfilePageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { ProfileLayout } from '../../web/pages/profile/ProfileLayout';
import { profileShellPreload } from '../../web/pages/profile/profileShellPreload';
import { profilePageCookOverviewVariables } from '../../web/pages/profilePageCookOverviewVariables';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';
import { returnToFromLocation } from '../../web/utils/returnTo';

export const Route = createFileRoute('/{-$locale}/profile')({
    loader: async ({ params, location }) => {
        const data = await routeLoaderGraphqlClient(ProfilePageDocument, profilePageCookOverviewVariables())();
        const user = data.currentSession.user;
        if (!user) {
            throw redirect({
                to: '/{-$locale}/log-on',
                params: { locale: params.locale },
                search: { returnTo: returnToFromLocation(location) },
            });
        }
        // Keep the role-shell chunk inside the router loading window so
        // NavigationProgress covers home → profile (no blank Suspense gap).
        await profileShellPreload(Boolean(user.cook));
        return data;
    },
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
            path: '/profile',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <ProfileLayout loaderData={Route.useLoaderData()} />;
    },
});
