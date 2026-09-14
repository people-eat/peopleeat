import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { PublicOccasionPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { OccasionPage } from '../../web/pages/OccasionPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { DEFAULT_LOCALE, localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/occasions_/$pathName')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(PublicOccasionPageDocument, {
            pathName: ctx.params.pathName,
        })();
        const occasion = data.publicOccasion.findOneByPathName;
        if (!occasion) {
            throw notFound();
        }
        if (occasion.pathName !== ctx.params.pathName) {
            const locale = localeFromParam(ctx.params);
            const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
            throw redirect({ href: `${prefix}/occasions/${occasion.pathName}`, statusCode: 301 });
        }
        return data;
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const occasion = loaderData?.publicOccasion.findOneByPathName;
        if (!occasion) {
            return {};
        }
        return seoMeta({
            title: contentLocaleText(occasion.titleDe, occasion.titleEn, locale),
            description: contentLocaleText(occasion.descriptionDe, occasion.descriptionEn, locale),
            path: `/occasions/${occasion.pathName}`,
            locale,
            webPageUrl: webPageUrlGet(),
            image: occasion.heroImageUrl ?? undefined,
        });
    },
    component() {
        return <OccasionPage data={Route.useLoaderData()} />;
    },
});
