import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminLegalDocumentPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminLegalDraftPath, isAdminLegalKind } from '../../../web/pages/admin/adminLegal';
import {
    AdminLegalDraftPage,
    adminLegalDraftPageDescription,
    adminLegalDraftPageTitle,
} from '../../../web/pages/admin/AdminLegalDraftPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/legal_/$kind_/draft')({
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
        const title = adminLegalDraftPageTitle(kind, locale);
        const description = adminLegalDraftPageDescription(kind, locale);
        return seoMeta({
            title,
            description,
            path: adminLegalDraftPath(kind),
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
        return <AdminLegalDraftPage data={Route.useLoaderData()} kind={kind} />;
    },
});
