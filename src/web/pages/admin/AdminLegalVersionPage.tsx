import { ScaleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { MarkdownBody } from '../../components/MarkdownBody';
import type { GqlCAdminLegalDocumentPageAdminFragment, GqlCAdminLegalDocumentPageQuery } from '../../graphql/generated';
import { AdminLegalDocumentPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { AdminLegalKind } from './adminLegal';
import { adminLegalKindLabel, adminLegalPublishedRows, adminLegalRowsFromAdmin } from './adminLegal';

export function adminLegalVersionPageTitle(kind: AdminLegalKind) {
    return {
        de: `${adminLegalKindLabel(kind, 'de')} · Version`,
        en: `${adminLegalKindLabel(kind, 'en')} · Version`,
    } as const;
}

export const adminLegalVersionPageDescription = {
    de: 'Veröffentlichte, unveränderliche Version.',
    en: 'Published immutable version.',
} as const;

export function AdminLegalVersionPage({
    data,
    kind,
    versionId,
}: {
    data: GqlCAdminLegalDocumentPageQuery;
    kind: AdminLegalKind;
    versionId: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState<GqlCAdminLegalDocumentPageAdminFragment | null>(seedAdmin);

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminLegalDocumentPageUpdatesDocument, {});
        const operation = client.executeSubscription(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                const next = result.data?.adminUpdates;
                if (next) {
                    setAdmin(next);
                }
            }),
        );
        return unsubscribe;
    }, [client, seedAdmin]);

    const rows = useMemo(() => (admin ? adminLegalRowsFromAdmin(admin, kind) : []), [admin, kind]);
    const published = useMemo(() => adminLegalPublishedRows(rows), [rows]);
    const version = published.find((row) => row.id === versionId) ?? null;
    const isCurrent = published[0]?.id === versionId;

    if (!admin) {
        return null;
    }

    const title = adminLegalVersionPageTitle(kind);

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                            <ScaleIcon className="size-8 shrink-0 text-muted-foreground" aria-hidden />
                            {title[locale]}
                        </h1>
                        {version && isCurrent ? <Badge variant="outline">{{ de: 'Aktuell', en: 'Current' }[locale]}</Badge> : null}
                    </div>
                    {version ? (
                        <p className="text-muted-foreground">
                            {formatDate(version.publishedAt, { locale, timeZone, dateStyle: 'long' })}
                            {version.changeSummaryDe.trim() ? ` · ${version.changeSummaryDe}` : ''}
                        </p>
                    ) : (
                        <p className="text-muted-foreground">{adminLegalVersionPageDescription[locale]}</p>
                    )}
                </div>

                {version ? (
                    <div className="rounded-lg border border-border/60 p-6">
                        <MarkdownBody text={version.bodyDe} />
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">{{ de: 'Version nicht gefunden.', en: 'Version not found.' }[locale]}</p>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
