import { createFileRoute, redirect } from '@tanstack/react-router';

import { i18nResourcesLoad } from '../../i18n/catalogCache';
import { namespacesLoadedForProfileSession, PROFILE_I18N_NAMESPACES } from '../../i18n/namespacesForPath';
import { contentLocaleText } from '../../shared/contentSection';
import { ProfilePageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { ProfileLayout } from '../../web/pages/profile/ProfileLayout';
import { profileShellPreload } from '../../web/pages/profile/profileShellPreload';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam, pathWithoutLocale } from '../../web/utils/locale';
import { returnToFromLocation } from '../../web/utils/returnTo';

export const Route = createFileRoute('/{-$locale}/profile')({
    loader: async ({ params, location }) => {
        const data = await routeLoaderGraphqlClient(ProfilePageDocument)();
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
        const isCook = Boolean(user.cook);
        const locale = localeFromParam(params);
        await Promise.all([
            profileShellPreload(isCook),
            i18nResourcesLoad(locale, namespacesLoadedForProfileSession(pathWithoutLocale(location.pathname), isCook)),
        ]);
        return data;
    },
    staleTime: 0,
    // Client hydrate restores loader data without re-running the loader side
    // effect, so child `head()` `t(profileCook|profileCustomer)` would throw.
    // Re-load the role catalog here first: parent heads run before children.
    head: async ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const user = loaderData?.currentSession.user;
        if (user) {
            // Hydrate restores loader data without the path, so load both role
            // catalogs here. Path extras (`publicBooking`) come from the locale layout.
            await i18nResourcesLoad(locale, [...PROFILE_I18N_NAMESPACES, 'profileCook', 'profileCustomer']);
        }
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
