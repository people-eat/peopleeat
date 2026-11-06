import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminOfferAddonTemplatePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminOfferAddonTemplatePage,
    adminOfferAddonTemplatePageDescription,
    adminOfferAddonTemplatePageTitle,
} from '../../../web/pages/admin/AdminOfferAddonTemplatePage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/offer-addon-templates_/$offerAddonTemplateId')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(AdminOfferAddonTemplatePageDocument, {
            offerAddonTemplateId: ctx.params.offerAddonTemplateId,
        })();
        if (!data.currentSession.user?.admin?.offerAddonTemplate) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminOfferAddonTemplatePageTitle[locale],
            description: adminOfferAddonTemplatePageDescription[locale],
            path: `/admin/offer-addon-templates/${params.offerAddonTemplateId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { offerAddonTemplateId } = Route.useParams();
        return (
            <AdminOfferAddonTemplatePage
                key={offerAddonTemplateId}
                data={Route.useLoaderData()}
                offerAddonTemplateId={offerAddonTemplateId}
            />
        );
    },
});
