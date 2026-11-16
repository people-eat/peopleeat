import { useRouter } from '@tanstack/react-router';
import { RefreshCwIcon } from 'lucide-react';

import { t } from '../../../i18n/t';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import type { GqlCAdminDatabaseSlowStatementsPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { adminStubRouteBySlug, adminStubRouteDescription, adminStubRouteTitle } from './adminCatalog';

const route = adminStubRouteBySlug('database-slow-statements');

export function adminDatabaseSlowStatementsPageTitle(locale: Locale): string {
    return adminStubRouteTitle(route.slug, locale);
}
export function adminDatabaseSlowStatementsPageDescription(locale: Locale): string {
    return adminStubRouteDescription(route.slug, locale);
}

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
                        <h1 className="text-2xl font-medium">{adminDatabaseSlowStatementsPageTitle(locale)}</h1>
                        <p className="text-sm text-muted-foreground">{adminDatabaseSlowStatementsPageDescription(locale)}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void router.invalidate()}>
                        <RefreshCwIcon className="size-4" aria-hidden />
                        {t(locale, 'admin', 'copy.refresh')}
                    </Button>
                </div>

                {statements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.noStatementsEitherThePgStatStatementsExtensionIsNotEnabledOr')}
                    </p>
                ) : (
                    <div className="overflow-x-auto border border-border">
                        <table className="w-full min-w-200 text-left text-sm">
                            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 font-medium">{t(locale, 'admin', 'copy.total')}</th>
                                    <th className="px-4 py-2 font-medium">{t(locale, 'admin', 'copy.mean')}</th>
                                    <th className="px-4 py-2 font-medium">{t(locale, 'admin', 'copy.calls')}</th>
                                    <th className="px-4 py-2 font-medium">{t(locale, 'admin', 'copy.rows')}</th>
                                    <th className="px-4 py-2 font-medium">{t(locale, 'admin', 'copy.query')}</th>
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
