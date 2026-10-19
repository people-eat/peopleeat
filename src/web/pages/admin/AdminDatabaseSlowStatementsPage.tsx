import { useRouter } from '@tanstack/react-router';
import { RefreshCwIcon } from 'lucide-react';

import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import type { GqlCAdminDatabaseSlowStatementsPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { adminStubRouteBySlug } from './adminCatalog';

const route = adminStubRouteBySlug('database-slow-statements');

export const adminDatabaseSlowStatementsPageTitle = route.title;
export const adminDatabaseSlowStatementsPageDescription = route.description;

export function adminDatabaseSlowStatementsPageVariables() {
    return { limit: 50 };
}

function formatMs(value: number, locale: Locale): string {
    return `${value.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
    })} ms`;
}

function formatCount(value: number, locale: Locale): string {
    return value.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US');
}

export function AdminDatabaseSlowStatementsPage({ data }: { data: GqlCAdminDatabaseSlowStatementsPageQuery }) {
    const locale = useLocale();
    const router = useRouter();
    const statements = data.currentSession.user?.admin?.databaseSlowStatements ?? [];

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-medium">{adminDatabaseSlowStatementsPageTitle[locale]}</h1>
                        <p className="text-sm text-muted-foreground">{adminDatabaseSlowStatementsPageDescription[locale]}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void router.invalidate()}>
                        <RefreshCwIcon className="size-4" aria-hidden />
                        {{ de: 'Aktualisieren', en: 'Refresh' }[locale]}
                    </Button>
                </div>

                {statements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Keine Statements. Entweder ist die Extension pg_stat_statements nicht aktiviert, oder es liegen noch keine Statistiken vor.',
                                en: 'No statements. Either the pg_stat_statements extension is not enabled, or there are no stats yet.',
                            }[locale]
                        }
                    </p>
                ) : (
                    <div className="overflow-x-auto border border-border">
                        <table className="w-full min-w-200 text-left text-sm">
                            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 font-medium">{{ de: 'Gesamt', en: 'Total' }[locale]}</th>
                                    <th className="px-4 py-2 font-medium">{{ de: 'Mittel', en: 'Mean' }[locale]}</th>
                                    <th className="px-4 py-2 font-medium">{{ de: 'Aufrufe', en: 'Calls' }[locale]}</th>
                                    <th className="px-4 py-2 font-medium">{{ de: 'Zeilen', en: 'Rows' }[locale]}</th>
                                    <th className="px-4 py-2 font-medium">{{ de: 'Query', en: 'Query' }[locale]}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {statements.map((statement, index) => (
                                    <tr key={`${index}-${statement.query.slice(0, 48)}`} className="align-top">
                                        <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                                            {formatMs(statement.totalExecTimeMs, locale)}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                                            {formatMs(statement.meanExecTimeMs, locale)}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap tabular-nums">{formatCount(statement.calls, locale)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap tabular-nums">{formatCount(statement.rows, locale)}</td>
                                        <td className="px-4 py-2 font-mono text-xs break-all whitespace-pre-wrap">{statement.query}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
