import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { PublicVenuePageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { VenuePage } from '../../web/pages/VenuePage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { DEFAULT_LOCALE, localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/venues_/$pathName')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(PublicVenuePageDocument, {
            pathName: ctx.params.pathName,
        })();
        const venue = data.publicPartnerVenue.findOneByPathName;
        if (!venue) {
            throw notFound();
        }
        if (venue.pathName !== ctx.params.pathName) {
            const locale = localeFromParam(ctx.params);
            const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
            throw redirect({ href: `${prefix}/venues/${venue.pathName}`, statusCode: 301 });
        }
        return data;
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const venue = loaderData?.publicPartnerVenue.findOneByPathName;
        if (!venue) {
            return {};
        }
        return seoMeta({
            title: contentLocaleText(venue.titleDe, venue.titleEn, locale),
            description: contentLocaleText(venue.descriptionDe, venue.descriptionEn, locale),
            path: `/venues/${venue.pathName}`,
            locale,
            webPageUrl: webPageUrlGet(),
            image: venue.heroImageUrl ?? undefined,
        });
    },
    component() {
        return <VenuePage data={Route.useLoaderData()} />;
    },
});
