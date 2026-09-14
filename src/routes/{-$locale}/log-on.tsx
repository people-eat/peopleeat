import { createFileRoute, redirect } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { LogOnPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { LogOnPage } from '../../web/pages/LogOnPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';
import { parseSignInSearch, returnToSafe } from '../../web/utils/returnTo';

export const Route = createFileRoute('/{-$locale}/log-on')({
    validateSearch: (search: Record<string, unknown>) => parseSignInSearch(search),
    loaderDeps: ({ search: { returnTo } }) => ({ returnTo }),
    loader: async ({ params, deps }) => {
        const data = await routeLoaderGraphqlClient(LogOnPageDocument)();
        if (data.currentSession.user) {
            const safeReturnTo = returnToSafe(deps.returnTo);
            if (safeReturnTo) {
                throw redirect({ href: safeReturnTo });
            }
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
            path: '/log-on',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <LogOnPage loaderData={Route.useLoaderData()} returnTo={Route.useSearch().returnTo} />;
    },
});
