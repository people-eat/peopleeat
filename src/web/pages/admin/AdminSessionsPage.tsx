import { Link, useNavigate } from '@tanstack/react-router';
import type { SortingState, Updater } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Input } from '../../components/base/input';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminSessionKind, GqlCAdminSessionsPageQuery } from '../../graphql/generated';
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
import { adminSessionKindLabel } from './adminSessions';
import { ADMIN_SESSIONS_SORT_FIELDS } from './adminSessionsColumns';
import type { AdminSessionsSortField } from './adminSessionsColumns';
import { AdminSessionsDataTable } from './AdminSessionsDataTable';

export const adminSessionsPageTitle = { de: 'Sitzungsliste', en: 'Session list' } as const;
export const adminSessionsPageDescription = {
    de: 'Sitzungen durchsuchen und einsehen.',
    en: 'Browse and inspect sessions.',
} as const;

const ADMIN_SESSIONS_ALL_KINDS: GqlCAdminSessionKind[] = ['human', 'bot'];

export type AdminSessionsSearch = {
    q?: string;
    kind?: GqlCAdminSessionKind;
    page?: number;
    pageSize?: AdminListPageSize;
    sort?: AdminSessionsSortField;
    dir?: 'asc' | 'desc';
};

function adminSessionsSearchForUrl(search: AdminSessionsSearch) {
    return {
        q: search.q,
        kind: search.kind,
        ...adminListPaginationForUrl(search),
        ...adminListSortSearchForUrl(search),
    };
}

export function parseAdminSessionsSearch(search: Record<string, unknown>): AdminSessionsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const kind = search.kind === 'human' || search.kind === 'bot' ? search.kind : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_SESSIONS_SORT_FIELDS);
    return { q, kind, page, pageSize, sort, dir };
}

export function adminSessionsPageVariables(search: AdminSessionsSearch) {
    return {
        criterion: {
            ...adminListSkipTake(search),
            searchText: search.q,
            kinds: search.kind ? [search.kind] : ADMIN_SESSIONS_ALL_KINDS,
            ...adminListSortToCriterion(search),
        },
    };
}

export function AdminSessionsPage({ data, search }: { data: GqlCAdminSessionsPageQuery; search: AdminSessionsSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/sessions/list' });
    const admin = data.currentSession.user?.admin;
    const sessions = admin?.sessions ?? [];
    const total = admin?.sessionCounts[0] ?? 0;
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
            search: adminSessionsSearchForUrl({
                ...search,
                q: nextQ,
                page: undefined,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search]);

    function updateSearch(next: AdminSessionsSearch) {
        void navigate({
            search: adminSessionsSearchForUrl(next),
        });
    }

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSort = adminListSortFromSortingState(updater, sorting, ADMIN_SESSIONS_SORT_FIELDS);
        updateSearch({
            ...search,
            page: undefined,
            sort: nextSort.sort,
            dir: nextSort.dir,
        });
    }

    const kindTabs: { value: GqlCAdminSessionKind | undefined; label: string }[] = [
        { value: undefined, label: { de: 'Alle', en: 'All' }[locale] },
        ...ADMIN_SESSIONS_ALL_KINDS.map((kind) => ({
            value: kind,
            label: adminSessionKindLabel(kind, locale),
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
                <Tabs value={search.kind ?? 'all'}>
                    <TabsList variant="line" aria-label={{ de: 'Sitzungs-Art', en: 'Session kind' }[locale]}>
                        {kindTabs.map((tab) => (
                            <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/sessions/list"
                                    search={adminSessionsSearchForUrl({
                                        ...search,
                                        kind: tab.value,
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
                        placeholder={
                            {
                                de: 'Sitzungs-ID, Nutzer-ID oder User-Agent suchen…',
                                en: 'Search session id, user id, or user agent…',
                            }[locale]
                        }
                        aria-label={{ de: 'Sitzungen suchen', en: 'Search sessions' }[locale]}
                    />
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {
                            {
                                de: `${total} ${total === 1 ? 'Sitzung' : 'Sitzungen'}`,
                                en: `${total} ${total === 1 ? 'session' : 'sessions'}`,
                            }[locale]
                        }
                    </p>
                </div>

                <AdminSessionsDataTable data={sessions} sorting={sorting} onSortingChange={onSortingChange} />
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
