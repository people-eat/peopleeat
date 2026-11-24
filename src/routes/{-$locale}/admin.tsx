import { createFileRoute, redirect } from '@tanstack/react-router';

import { i18nResourcesLoad } from '../../i18n/catalogCache';
import { ADMIN_I18N_NAMESPACES } from '../../i18n/namespacesForPath';
import { contentLocaleText } from '../../shared/contentSection';
import { AdminPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { AdminLayout } from '../../web/pages/admin/AdminLayout';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';
import { returnToFromLocation } from '../../web/utils/returnTo';

export const Route = createFileRoute('/{-$locale}/admin')({
    loader: async ({ params, location }) => {
        const data = await routeLoaderGraphqlClient(AdminPageDocument)();
        const user = data.currentSession.user;
        if (!user) {
            throw redirect({
                to: '/{-$locale}/log-on',
                params: { locale: params.locale },
                search: { returnTo: returnToFromLocation(location) },
            });
        }
        if (!user.admin) {
            throw redirect({
                to: '/{-$locale}/profile',
                params: { locale: params.locale },
            });
        }
        // Keep admin catalog download inside NavigationProgress for home → admin
        // (locale layout may not re-run when only the child path changes).
        const locale = localeFromParam(params);
        await i18nResourcesLoad(locale, ADMIN_I18N_NAMESPACES);
        return data;
    },
    staleTime: 0,
    // Client hydrate restores loader data without re-running the loader side
    // effect, so child `head()` / shell `t(admin)` would throw. Re-load here
    // first: parent heads run before children.
    head: async ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        if (loaderData?.currentSession.user?.admin) {
            await i18nResourcesLoad(locale, ADMIN_I18N_NAMESPACES);
        }
        const webPage = loaderData?.publicWebPage.findOne;
        if (!webPage) {
            return {};
        }
        return seoMeta({
            title: contentLocaleText(webPage.titleDe, webPage.titleEn, locale),
            description: contentLocaleText(webPage.descriptionDe, webPage.descriptionEn, locale),
            path: '/admin',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminLayout loaderData={Route.useLoaderData()} />;
    },
});
