import { Link, useNavigate } from '@tanstack/react-router';
import type { SortingState, Updater } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Checkbox } from '../../components/base/checkbox';
import { Input } from '../../components/base/input';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminUsersPageQuery, GqlCAdminUserType, GqlCUserStatus } from '../../graphql/generated';
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
import { ADMIN_USERS_SORT_FIELDS, adminUserStatusLabel, adminUserTypeLabel } from './adminUsersColumns';
import type { AdminUsersSortField } from './adminUsersColumns';
import { AdminUsersDataTable } from './AdminUsersDataTable';

export const adminUsersPageTitle = { de: 'Benutzerliste', en: 'User list' } as const;
export const adminUsersPageDescription = {
    de: 'Registrierte Konten durchsuchen und einsehen.',
    en: 'Browse and inspect registered accounts.',
} as const;

const ADMIN_USERS_ALL_TYPES: GqlCAdminUserType[] = ['customer', 'cook', 'admin'];
const ADMIN_USERS_STATUS_OPTIONS: Array<GqlCUserStatus | undefined> = [undefined, 'ACTIVE', 'BANNED', 'ANONYMIZED'];

export type AdminUsersSearch = {
    q?: string;
    type?: GqlCAdminUserType;
    status?: GqlCUserStatus;
    unapproved?: true;
    page?: number;
    pageSize?: AdminListPageSize;
    sort?: AdminUsersSortField;
    dir?: 'asc' | 'desc';
};

function adminUsersSearchForUrl(search: AdminUsersSearch) {
    return {
        q: search.q,
        type: search.type,
        status: search.status,
        unapproved: search.type === 'cook' ? search.unapproved : undefined,
        ...adminListPaginationForUrl(search),
        ...adminListSortSearchForUrl(search),
    };
}

export function parseAdminUsersSearch(search: Record<string, unknown>): AdminUsersSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const type = search.type === 'customer' || search.type === 'cook' || search.type === 'admin' ? search.type : undefined;
    const status = search.status === 'ACTIVE' || search.status === 'BANNED' || search.status === 'ANONYMIZED' ? search.status : undefined;
    const unapproved = search.unapproved === '1' || search.unapproved === true ? true : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_USERS_SORT_FIELDS);
    return { q, type, status, unapproved: type === 'cook' ? unapproved : undefined, page, pageSize, sort, dir };
}

export function adminUsersPageVariables(search: AdminUsersSearch) {
    return {
        criterion: {
            ...adminListSkipTake(search),
            searchText: search.q,
            types: search.type ? [search.type] : ADMIN_USERS_ALL_TYPES,
            isApprovedByAdmin: search.unapproved ? false : undefined,
            status: search.status,
            ...adminListSortToCriterion(search),
        },
    };
}

export function AdminUsersPage({ data, search }: { data: GqlCAdminUsersPageQuery; search: AdminUsersSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/users/list' });
    const admin = data.currentSession.user?.admin;
    const users = admin?.users ?? [];
    const total = admin?.userCounts[0] ?? 0;
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
            search: adminUsersSearchForUrl({
                ...search,
                q: nextQ,
                page: undefined,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search]);

    function updateSearch(next: AdminUsersSearch) {
        void navigate({
            search: adminUsersSearchForUrl(next),
        });
    }

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSort = adminListSortFromSortingState(updater, sorting, ADMIN_USERS_SORT_FIELDS);
        updateSearch({ ...search, page: undefined, sort: nextSort.sort, dir: nextSort.dir });
    }

    const typeTabs: { value: GqlCAdminUserType | undefined; label: string }[] = [
        { value: undefined, label: { de: 'Alle', en: 'All' }[locale] },
        ...ADMIN_USERS_ALL_TYPES.map((type) => ({
            value: type,
            label: adminUserTypeLabel(type, locale),
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
                <Tabs value={search.type ?? 'all'}>
                    <TabsList variant="line" aria-label={{ de: 'Nutzer-Typ', en: 'User type' }[locale]}>
                        {typeTabs.map((tab) => (
                            <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/users/list"
                                    search={adminUsersSearchForUrl({
                                        ...search,
                                        type: tab.value,
                                        unapproved: undefined,
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

                <Tabs value={search.status ?? 'all'}>
                    <TabsList variant="line" aria-label={{ de: 'Nutzer-Status', en: 'User status' }[locale]}>
                        {ADMIN_USERS_STATUS_OPTIONS.map((status) => (
                            <TabsTrigger key={status ?? 'all'} value={status ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/users/list"
                                    search={adminUsersSearchForUrl({
                                        ...search,
                                        status,
                                        page: undefined,
                                    })}
                                    replace
                                >
                                    {status == null
                                        ? { de: 'Alle Status', en: 'All statuses' }[locale]
                                        : adminUserStatusLabel(status, locale)}
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
                        placeholder={{ de: 'Name oder E-Mail suchen…', en: 'Search name or email…' }[locale]}
                        aria-label={{ de: 'Nutzer suchen', en: 'Search users' }[locale]}
                    />
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {
                            {
                                de: `${total} ${total === 1 ? 'Nutzer' : 'Nutzer'}`,
                                en: `${total} ${total === 1 ? 'user' : 'users'}`,
                            }[locale]
                        }
                    </p>
                </div>

                {search.type === 'cook' ? (
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={Boolean(search.unapproved)}
                            onCheckedChange={(checked) =>
                                updateSearch({
                                    ...search,
                                    page: undefined,
                                    unapproved: checked === true ? true : undefined,
                                })
                            }
                        />
                        {{ de: 'Nur nicht freigeschaltete', en: 'Unapproved only' }[locale]}
                    </label>
                ) : null}

                <AdminUsersDataTable data={users} sorting={sorting} onSortingChange={onSortingChange} />
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
