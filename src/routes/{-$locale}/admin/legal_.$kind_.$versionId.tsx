import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { AdminLegalDocumentPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminLegalDraftRow, adminLegalRowsFromAdmin, adminLegalVersionPath, isAdminLegalKind } from '../../../web/pages/admin/adminLegal';
import {
    AdminLegalVersionPage,
    adminLegalVersionPageDescription,
    adminLegalVersionPageTitle,
} from '../../../web/pages/admin/AdminLegalVersionPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/legal_/$kind_/$versionId')({
    beforeLoad: ({ params }) => {
        if (!isAdminLegalKind(params.kind)) {
            throw notFound();
        }
    },
    loader: async ({ params }) => {
        const data = await routeLoaderGraphqlClient(AdminLegalDocumentPageDocument)();
        if (!isAdminLegalKind(params.kind)) {
            throw notFound();
        }
        const admin = data.currentSession.user?.admin;
        if (admin) {
            const rows = adminLegalRowsFromAdmin(admin, params.kind);
            const draft = adminLegalDraftRow(rows);
            if (draft?.id === params.versionId) {
                throw redirect({
                    to: '/{-$locale}/admin/legal/$kind/draft',
                    params: { locale: params.locale, kind: params.kind },
                });
            }
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        if (!isAdminLegalKind(params.kind)) {
            return {};
        }
        const kind = params.kind;
        const title = adminLegalVersionPageTitle(kind);
        return seoMeta({
            title: title[locale],
            description: adminLegalVersionPageDescription[locale],
            path: adminLegalVersionPath(kind, params.versionId),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { kind, versionId } = Route.useParams();
        if (!isAdminLegalKind(kind)) {
            return null;
        }
        return <AdminLegalVersionPage data={Route.useLoaderData()} kind={kind} versionId={versionId} />;
    },
});
