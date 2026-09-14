import { Link, useNavigate } from '@tanstack/react-router';
import type { SortingState, Updater } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Input } from '../../components/base/input';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminLogLevel, GqlCAdminLogsPageQuery } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import {
    adminListPageCount,
    adminListPageSize,
    adminListPaginationForUrl,
    adminListSkipTake,
    parseAdminListPage,
    parseAdminListPageSize,
} from './adminListPaginationSearch';
import type { AdminListPageSize } from './adminListPaginationSearch';
import {
    adminListSortFromSortingState,
    adminListSortingState,
    adminListSortSearchForUrl,
    adminListSortToCriterion,
    parseAdminListSortSearch,
} from './adminListSortSearch';
import { ADMIN_LOGS_SORT_FIELDS, adminLogLevelLabel } from './adminLogsColumns';
import type { AdminLogsSortField } from './adminLogsColumns';
import { AdminLogsDataTable } from './AdminLogsDataTable';

export const adminLogsPageTitle = { de: 'Log-Liste', en: 'Log list' } as const;
export const adminLogsPageDescription = {
    de: 'Log-Nachrichten durchsuchen und einsehen.',
    en: 'Browse and inspect log messages.',
} as const;

const ADMIN_LOGS_ALL_LEVELS: GqlCAdminLogLevel[] = ['error', 'warn', 'info', 'debug'];

export type AdminLogsSearch = {
    q?: string;
    level?: GqlCAdminLogLevel;
    page?: number;
    pageSize?: AdminListPageSize;
    sort?: AdminLogsSortField;
    dir?: 'asc' | 'desc';
};

function adminLogsSearchForUrl(search: AdminLogsSearch) {
    return {
        q: search.q,
        level: search.level,
        ...adminListPaginationForUrl(search),
        ...adminListSortSearchForUrl(search),
    };
}

export function parseAdminLogsSearch(search: Record<string, unknown>): AdminLogsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const level =
        search.level === 'error' || search.level === 'warn' || search.level === 'info' || search.level === 'debug'
            ? search.level
            : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_LOGS_SORT_FIELDS);
    return { q, level, page, pageSize, sort, dir };
}

export function adminLogsPageVariables(search: AdminLogsSearch) {
    return {
        criterion: {
            ...adminListSkipTake(search),
            searchText: search.q,
            levels: search.level ? [search.level] : ADMIN_LOGS_ALL_LEVELS,
            ...adminListSortToCriterion(search),
        },
    };
}

export function AdminLogsPage({ data, search }: { data: GqlCAdminLogsPageQuery; search: AdminLogsSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/logs/list' });
    const admin = data.currentSession.user?.admin;
    const logs = admin?.logs ?? [];
    const total = admin?.logCounts[0] ?? 0;
    const page = search.page ?? 1;
    const pageSize = adminListPageSize(search);
    const pageCount = adminListPageCount(total, pageSize);
    const sorting = adminListSortingState(search);

    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({
            search: adminLogsSearchForUrl({
                ...search,
                q: nextQ,
                page: undefined,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search]);

    function updateSearch(next: AdminLogsSearch) {
        void navigate({
            search: adminLogsSearchForUrl(next),
        });
    }

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSort = adminListSortFromSortingState(updater, sorting, ADMIN_LOGS_SORT_FIELDS);
        updateSearch({ ...search, page: undefined, sort: nextSort.sort, dir: nextSort.dir });
    }

    const levelTabs: { value: GqlCAdminLogLevel | undefined; label: string }[] = [
        { value: undefined, label: { de: 'Alle', en: 'All' }[locale] },
        ...ADMIN_LOGS_ALL_LEVELS.map((level) => ({
            value: level,
            label: adminLogLevelLabel(level, locale),
        })),
    ];

    return (
        <AdminPathPageChrome contentClassName="min-h-0 overflow-hidden gap-0">
            <AdminPinnedFooterLayout
                contentClassName="grid w-full content-start gap-6"
                footer={
                    <AdminListPaginationBar
                        page={page}
                        pageCount={pageCount}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={(nextPage) => updateSearch({ ...search, page: nextPage })}
                        onPageSizeChange={(nextPageSize) =>
                            updateSearch({
                                ...search,
                                page: undefined,
                                pageSize: nextPageSize,
                            })
                        }
                    />
                }
            >
                <Tabs value={search.level ?? 'all'}>
                    <TabsList variant="line" aria-label={{ de: 'Log-Level', en: 'Log level' }[locale]}>
                        {levelTabs.map((tab) => (
                            <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/logs/list"
                                    search={adminLogsSearchForUrl({
                                        ...search,
                                        level: tab.value,
                                        page: undefined,
                                    })}
                                    replace
                                >
                                    {tab.label}
                                </Link>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <Input
                        type="search"
                        value={draftQ}
                        onChange={(event) => setDraftQ(event.target.value)}
                        placeholder={{ de: 'Nachricht suchen…', en: 'Search message…' }[locale]}
                        aria-label={{ de: 'Log-Nachrichten suchen', en: 'Search log messages' }[locale]}
                    />
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {
                            {
                                de: `${total} ${total === 1 ? 'Nachricht' : 'Nachrichten'}`,
                                en: `${total} ${total === 1 ? 'message' : 'messages'}`,
                            }[locale]
                        }
                    </p>
                </div>

                <AdminLogsDataTable data={logs} sorting={sorting} onSortingChange={onSortingChange} />
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
