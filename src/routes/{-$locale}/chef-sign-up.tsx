import { createFileRoute, redirect } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { ChefSignUpPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { ChefSignUpPage } from '../../web/pages/ChefSignUpPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/chef-sign-up')({
    loader: async ({ params }) => {
        const data = await routeLoaderGraphqlClient(ChefSignUpPageDocument)();
        if (data.currentSession.user?.cook) {
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
            path: '/chef-sign-up',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <ChefSignUpPage loaderData={Route.useLoaderData()} />;
    },
});
