import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminLegalDocumentPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminLegalKindPath, isAdminLegalKind } from '../../../web/pages/admin/adminLegal';
import {
    AdminLegalDocumentPage,
    adminLegalDocumentPageDescription,
    adminLegalDocumentPageTitle,
} from '../../../web/pages/admin/AdminLegalDocumentPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/legal_/$kind')({
    beforeLoad: ({ params }) => {
        if (!isAdminLegalKind(params.kind)) {
            throw notFound();
        }
    },
    loader: routeLoaderGraphqlClient(AdminLegalDocumentPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        if (!isAdminLegalKind(params.kind)) {
            return {};
        }
        const kind = params.kind;
        const title = adminLegalDocumentPageTitle(kind);
        const description = adminLegalDocumentPageDescription(kind);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: adminLegalKindPath(kind),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { kind } = Route.useParams();
        if (!isAdminLegalKind(kind)) {
            return null;
        }
        return <AdminLegalDocumentPage data={Route.useLoaderData()} kind={kind} />;
    },
});
