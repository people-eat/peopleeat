import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { formatBytes, formatDateTime } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import type { GqlCAdminFileStorePageQuery } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminStubRouteBySlug } from './adminCatalog';

const route = adminStubRouteBySlug('file-store');

export const adminFileStorePageTitle = route.title;
export const adminFileStorePageDescription = route.description;

const ADMIN_FILE_STORE_PAGE_SIZE = 25;

export type AdminFileStoreSearch = {
    prefix?: string;
    cursor?: string;
};

export function parseAdminFileStoreSearch(search: Record<string, unknown>): AdminFileStoreSearch {
    const prefix = typeof search.prefix === 'string' && search.prefix.trim().length > 0 ? search.prefix.trim() : undefined;
    const cursor = typeof search.cursor === 'string' && search.cursor.trim().length > 0 ? search.cursor.trim() : undefined;
    return { prefix, cursor };
}

export function adminFileStorePageVariables(search: AdminFileStoreSearch) {
    return {
        criterion: {
            prefix: search.prefix,
            continuationToken: search.cursor,
            take: ADMIN_FILE_STORE_PAGE_SIZE,
        },
    };
}

function formatObjectLastModified(value: string | null | undefined, locale: 'de' | 'en', timeZone: string) {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminFileStorePage({ data, search }: { data: GqlCAdminFileStorePageQuery; search: AdminFileStoreSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/file-store' });
    const page = data.currentSession.user?.admin?.objectStorageObjects;
    const configured = page?.configured ?? false;
    const bucket = page?.bucket;
    const objects = page?.objects ?? [];
    const nextCursor = page?.nextContinuationToken ?? undefined;
    const isTruncated = page?.isTruncated ?? false;

    const [draftPrefix, setDraftPrefix] = useState(search.prefix ?? '');
    const debouncedPrefix = useDebouncedValue(draftPrefix, 300);

    useEffect(() => {
        setDraftPrefix(search.prefix ?? '');
    }, [search.prefix]);

    useEffect(() => {
        const nextPrefix = debouncedPrefix.trim() || undefined;
        if (nextPrefix === search.prefix) return;
        void navigate({
            search: { prefix: nextPrefix, cursor: undefined },
            replace: true,
        });
    }, [debouncedPrefix, navigate, search.prefix]);

    function updateSearch(next: AdminFileStoreSearch) {
        void navigate({
            search: {
                prefix: next.prefix,
                cursor: next.cursor,
            },
        });
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-medium">{adminFileStorePageTitle[locale]}</h1>
                        <p className="text-sm text-muted-foreground">
                            {adminFileStorePageDescription[locale]}
                            {configured && bucket
                                ? {
                                      de: ` Bucket: ${bucket}.`,
                                      en: ` Bucket: ${bucket}.`,
                                  }[locale]
                                : null}
                        </p>
                    </div>
                    {configured ? (
                        <Input
                            value={draftPrefix}
                            onChange={(event) => setDraftPrefix(event.target.value)}
                            placeholder={{ de: 'Prefix filtern…', en: 'Filter by prefix…' }[locale]}
                            className="max-w-xs font-mono text-sm"
                            aria-label={{ de: 'Objekt-Prefix', en: 'Object key prefix' }[locale]}
                        />
                    ) : null}
                </div>

                {!configured ? (
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Objekt-Speicher ist nicht konfiguriert (OBJECT_STORAGE_S3_*).',
                                en: 'Object storage is not configured (OBJECT_STORAGE_S3_*).',
                            }[locale]
                        }
                    </p>
                ) : objects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Keine Objekte gefunden.',
                                en: 'No objects found.',
                            }[locale]
                        }
                    </p>
                ) : (
                    <div className="overflow-x-auto border border-border">
                        <table className="w-full min-w-160 text-left text-sm">
                            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 font-medium">{{ de: 'Schlüssel', en: 'Key' }[locale]}</th>
                                    <th className="px-4 py-2 font-medium">{{ de: 'Größe', en: 'Size' }[locale]}</th>
                                    <th className="px-4 py-2 font-medium">{{ de: 'Geändert', en: 'Last modified' }[locale]}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {objects.map((object) => (
                                    <tr key={object.key} className="align-top">
                                        <td className="px-4 py-2 font-mono text-xs break-all">{object.key}</td>
                                        <td className="px-4 py-2 whitespace-nowrap tabular-nums">{formatBytes(object.size)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                                            {formatObjectLastModified(object.lastModified, locale, timeZone)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {configured && (search.cursor || isTruncated) ? (
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: `${objects.length} Objekt${objects.length === 1 ? '' : 'e'}`,
                                    en: `${objects.length} object${objects.length === 1 ? '' : 's'}`,
                                }[locale]
                            }
                        </p>
                        <div className="flex gap-2">
                            {search.cursor ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => updateSearch({ prefix: search.prefix, cursor: undefined })}
                                >
                                    {{ de: 'Erste Seite', en: 'First page' }[locale]}
                                </Button>
                            ) : null}
                            {isTruncated && nextCursor ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => updateSearch({ prefix: search.prefix, cursor: nextCursor })}
                                >
                                    {{ de: 'Weiter', en: 'Next' }[locale]}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </main>
        </AdminPathPageChrome>
    );
}
