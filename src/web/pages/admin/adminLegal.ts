import type { GqlCAdminLegalDocumentPageAdminFragment } from '../../graphql/generated';
import type { Locale } from '../../utils/locale';

export type AdminLegalKind = 'privacy' | 'terms' | 'imprint';

export const ADMIN_LEGAL_KINDS: AdminLegalKind[] = ['privacy', 'terms', 'imprint'];

export type AdminLegalDocumentTo = '/{-$locale}/admin/legal/$kind';
export type AdminLegalDraftTo = '/{-$locale}/admin/legal/$kind/draft';
export type AdminLegalVersionTo = '/{-$locale}/admin/legal/$kind/$versionId';

export type AdminLegalRow = {
    id: string;
    bodyDe: string;
    changeSummaryDe: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
};

export function isAdminLegalKind(value: string): value is AdminLegalKind {
    return (ADMIN_LEGAL_KINDS as string[]).includes(value);
}

export function adminLegalKindLabel(kind: AdminLegalKind, locale: Locale): string {
    return (
        {
            privacy: { de: 'Datenschutz', en: 'Privacy policy' },
            terms: { de: 'AGB', en: 'Terms' },
            imprint: { de: 'Impressum', en: 'Imprint' },
        } as const
    )[kind][locale];
}

export function adminLegalKindPath(kind: AdminLegalKind): `/admin/legal/${AdminLegalKind}` {
    return `/admin/legal/${kind}`;
}

export function adminLegalKindTo(_kind: AdminLegalKind): AdminLegalDocumentTo {
    return '/{-$locale}/admin/legal/$kind';
}

export function adminLegalDraftPath(kind: AdminLegalKind): `/admin/legal/${AdminLegalKind}/draft` {
    return `/admin/legal/${kind}/draft`;
}

export function adminLegalDraftTo(_kind: AdminLegalKind): AdminLegalDraftTo {
    return '/{-$locale}/admin/legal/$kind/draft';
}

export function adminLegalVersionPath(kind: AdminLegalKind, versionId: string): string {
    return `/admin/legal/${kind}/${versionId}`;
}

export function adminLegalVersionTo(_kind: AdminLegalKind, _versionId: string): AdminLegalVersionTo {
    return '/{-$locale}/admin/legal/$kind/$versionId';
}

export function parseAdminLegalKindFromPath(path: string): AdminLegalKind | undefined {
    for (const kind of ADMIN_LEGAL_KINDS) {
        const base = adminLegalKindPath(kind);
        if (path === base || path.startsWith(`${base}/`)) {
            return kind;
        }
    }
    return undefined;
}

export function adminLegalRowsFromAdmin(admin: GqlCAdminLegalDocumentPageAdminFragment, kind: AdminLegalKind): AdminLegalRow[] {
    if (kind === 'privacy') {
        return admin.legalPrivacyPolicies.map((row) => ({
            id: row.privacyPolicyId,
            bodyDe: row.bodyDe,
            changeSummaryDe: row.changeSummaryDe,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            publishedAt: row.publishedAt ?? null,
        }));
    }
    if (kind === 'terms') {
        return admin.legalTermsAndConditions.map((row) => ({
            id: row.termsAndConditionsId,
            bodyDe: row.bodyDe,
            changeSummaryDe: row.changeSummaryDe,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            publishedAt: row.publishedAt ?? null,
        }));
    }
    return admin.legalImprints.map((row) => ({
        id: row.imprintId,
        bodyDe: row.bodyDe,
        changeSummaryDe: row.changeSummaryDe,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        publishedAt: row.publishedAt ?? null,
    }));
}

export function adminLegalPublishedRows(rows: AdminLegalRow[]): AdminLegalRow[] {
    return rows.filter((row) => row.publishedAt !== null).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
}

export function adminLegalDraftRow(rows: AdminLegalRow[]): AdminLegalRow | null {
    return rows.find((row) => row.publishedAt === null) ?? null;
}
