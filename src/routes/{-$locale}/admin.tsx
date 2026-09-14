import { createFileRoute, redirect } from '@tanstack/react-router';

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
