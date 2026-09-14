import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/base/card';
import { Input } from '../../components/base/input';
import { StatusBadge } from '../../components/base/status-badge';
import { Textarea } from '../../components/base/textarea';
import type { GqlCAdminWebPagePageQuery, GqlCWebPageKey } from '../../graphql/generated';
import { AdminWebPagePageUpdatesDocument, AdminWebPageUpdateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { adminWebPageLabel } from './adminWebPages';

export const adminWebPagePageTitle = { de: 'Webseite bearbeiten', en: 'Edit website' } as const;
export const adminWebPagePageDescription = {
    de: 'SEO-Titel und -Beschreibung bearbeiten.',
    en: 'Edit SEO title and description.',
} as const;

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
    const [, update] = useMutation(AdminWebPageUpdateDocument);

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
            if (!result.data?.admin.webPageUpdate.success || result.error) {
                throw new Error('update failed');
            }
            toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
        } catch {
            toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AdminPageChrome
            crumbs={[
                { label: { de: 'Webseiten', en: 'Websites' }[locale], to: '/{-$locale}/admin/web-pages' },
                { label: adminWebPageLabel(webPageKey, locale) },
            ]}
        >
            <AdminPinnedFooterLayout
                contentClassName="flex max-w-2xl flex-col gap-6"
                footer={
                    <Button type="button" disabled={busy} onClick={() => void onSave()}>
                        {busy ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                }
            >
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-medium">{adminWebPageLabel(webPageKey, locale)}</h1>
                        {!persisted ? (
                            <StatusBadge tone="info">{{ de: 'Nicht konfiguriert', en: 'Not configured' }[locale]}</StatusBadge>
                        ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{adminWebPagePageDescription[locale]}</p>
                </div>
                <Card className="gap-4 py-4">
                    <CardHeader className="px-4">
                        <CardTitle>{{ de: 'Deutsch', en: 'German' }[locale]}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 px-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="titleDe" className="text-sm font-medium">
                                {{ de: 'Titel', en: 'Title' }[locale]}
                            </label>
                            <Input
                                id="titleDe"
                                value={values.titleDe}
                                onChange={(e) => setValues((prev) => ({ ...prev, titleDe: e.target.value }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="descriptionDe" className="text-sm font-medium">
                                {{ de: 'Beschreibung', en: 'Description' }[locale]}
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
                        <CardTitle>{{ de: 'Englisch', en: 'English' }[locale]}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 px-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="titleEn" className="text-sm font-medium">
                                {{ de: 'Titel', en: 'Title' }[locale]}
                            </label>
                            <Input
                                id="titleEn"
                                value={values.titleEn}
                                onChange={(e) => setValues((prev) => ({ ...prev, titleEn: e.target.value }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="descriptionEn" className="text-sm font-medium">
                                {{ de: 'Beschreibung', en: 'Description' }[locale]}
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
