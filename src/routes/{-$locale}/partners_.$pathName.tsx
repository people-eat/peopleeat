import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { PublicPartnerPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { PartnerPage } from '../../web/pages/PartnerPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { DEFAULT_LOCALE, localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/partners_/$pathName')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(PublicPartnerPageDocument, {
            pathName: ctx.params.pathName,
        })();
        const partner = data.publicPartner.findOneByPathName;
        if (!partner) {
            throw notFound();
        }
        if (partner.pathName !== ctx.params.pathName) {
            const locale = localeFromParam(ctx.params);
            const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
            throw redirect({ href: `${prefix}/partners/${partner.pathName}`, statusCode: 301 });
        }
        return data;
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const partner = loaderData?.publicPartner.findOneByPathName;
        if (!partner) {
            return {};
        }
        return seoMeta({
            title: contentLocaleText(partner.titleDe, partner.titleEn, locale),
            description: contentLocaleText(partner.descriptionDe, partner.descriptionEn, locale),
            path: `/partners/${partner.pathName}`,
            locale,
            webPageUrl: webPageUrlGet(),
            image: partner.heroImageUrl ?? undefined,
        });
    },
    component() {
        return <PartnerPage data={Route.useLoaderData()} />;
    },
});
