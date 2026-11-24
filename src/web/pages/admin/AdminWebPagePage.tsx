import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { webPageKeyIsTracked } from '../../../shared/webPage';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/base/card';
import { Input } from '../../components/base/input';
import { StatusBadge } from '../../components/base/status-badge';
import { Textarea } from '../../components/base/textarea';
import type { GqlCAdminWebPagePageQuery, GqlCWebPageKey } from '../../graphql/generated';
import { AdminWebPagePageUpdatesDocument, AdminWebPageUpsertDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { adminWebPageLabel } from './adminWebPages';

export function adminWebPagePageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.webPage.title');
}
export function adminWebPagePageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.webPage.description');
}

type WebPageRow = NonNullable<NonNullable<GqlCAdminWebPagePageQuery['currentSession']['user']>['admin']>['webPage'];

type EditorValues = {
    titleDe: string;
    titleEn: string;
    descriptionDe: string;
    descriptionEn: string;
};

function valuesFromWebPage(webPage: WebPageRow): EditorValues {
    return {
        titleDe: webPage.titleDe,
        titleEn: webPage.titleEn,
        descriptionDe: webPage.descriptionDe,
        descriptionEn: webPage.descriptionEn,
    };
}

export function AdminWebPagePage({ data, webPageKey }: { data: GqlCAdminWebPagePageQuery; webPageKey: GqlCWebPageKey }) {
    const locale = useLocale();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedWebPage = seedAdmin?.webPage;
    if (!seedWebPage) throw new Error('AdminWebPagePage: expected webPage from loader');

    const [values, setValues] = useState<EditorValues>(() => valuesFromWebPage(seedWebPage));
    const [persisted, setPersisted] = useState(seedWebPage.persisted);
    const [busy, setBusy] = useState(false);
    const [, update] = useMutation(AdminWebPageUpsertDocument);

    useEffect(() => {
        const request = createRequest(AdminWebPagePageUpdatesDocument, { webPageKey });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.webPage;
                if (next) {
                    setValues(valuesFromWebPage(next));
                    setPersisted(next.persisted);
                }
            }),
        );
        return unsubscribe;
    }, [client, webPageKey]);

    async function onSave() {
        setBusy(true);
        try {
            const result = await update({
                webPageKey,
                input: {
                    titleDe: values.titleDe,
                    titleEn: values.titleEn,
                    descriptionDe: values.descriptionDe,
                    descriptionEn: values.descriptionEn,
                },
            });
            if (!result.data?.admin.webPageUpsert.success || result.error) {
                throw new Error('update failed');
            }
            toast.success(t(locale, 'admin', 'copy.saved'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotSave'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <AdminPageChrome
            crumbs={[
                { label: t(locale, 'admin', 'copy.websites'), to: '/{-$locale}/admin/web-pages' },
                { label: adminWebPageLabel(webPageKey, locale) },
            ]}
        >
            <AdminPinnedFooterLayout
                contentClassName="flex max-w-2xl flex-col gap-6"
                footer={
                    <Button type="button" disabled={busy} onClick={() => void onSave()}>
                        {busy ? t(locale, 'admin', 'copy.saving2') : t(locale, 'admin', 'copy.save')}
                    </Button>
                }
            >
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-medium">{adminWebPageLabel(webPageKey, locale)}</h1>
                        {!persisted ? <StatusBadge tone="info">{t(locale, 'admin', 'copy.notConfigured')}</StatusBadge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{adminWebPagePageDescription(locale)}</p>
                    {webPageKeyIsTracked(webPageKey) ? (
                        <p className="mt-2 text-sm">
                            <Link
                                to="/{-$locale}/admin/traffic"
                                search={{ keys: webPageKey }}
                                className="text-muted-foreground underline-offset-4 hover:underline"
                            >
                                {t(locale, 'admin', 'traffic.viewTraffic')}
                            </Link>
                        </p>
                    ) : null}
                </div>
                <Card className="gap-4 py-4">
                    <CardHeader className="px-4">
                        <CardTitle>{t(locale, 'admin', 'copy.german')}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 px-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="titleDe" className="text-sm font-medium">
                                {t(locale, 'admin', 'copy.title')}
                            </label>
                            <Input
                                id="titleDe"
                                value={values.titleDe}
                                onChange={(e) => setValues((prev) => ({ ...prev, titleDe: e.target.value }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="descriptionDe" className="text-sm font-medium">
                                {t(locale, 'admin', 'copy.description')}
                            </label>
                            <Textarea
                                id="descriptionDe"
                                rows={4}
                                value={values.descriptionDe}
                                onChange={(e) => setValues((prev) => ({ ...prev, descriptionDe: e.target.value }))}
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card className="gap-4 py-4">
                    <CardHeader className="px-4">
                        <CardTitle>{t(locale, 'admin', 'copy.english')}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 px-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="titleEn" className="text-sm font-medium">
                                {t(locale, 'admin', 'copy.title')}
                            </label>
                            <Input
                                id="titleEn"
                                value={values.titleEn}
                                onChange={(e) => setValues((prev) => ({ ...prev, titleEn: e.target.value }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="descriptionEn" className="text-sm font-medium">
                                {t(locale, 'admin', 'copy.description')}
                            </label>
                            <Textarea
                                id="descriptionEn"
                                rows={4}
                                value={values.descriptionEn}
                                onChange={(e) => setValues((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                            />
                        </div>
                    </CardContent>
                </Card>
            </AdminPinnedFooterLayout>
        </AdminPageChrome>
    );
}
