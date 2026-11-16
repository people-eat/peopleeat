import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { inlineCopy } from '../../../shared';
import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Checkbox } from '../../components/base/checkbox';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { SupportRequestSummaryCard } from '../../components/SupportRequestSummaryCard';
import type {
    GqlCAdminSupportRequestSortField,
    GqlCAdminSupportRequestsPageAdminFragment,
    GqlCAdminSupportRequestsPageQuery,
    GqlCSupportRequestStatus,
} from '../../graphql/generated';
import { AdminSupportRequestsPageUpdatesDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { adminStubRouteBySlug, adminStubRouteDescription, adminStubRouteTitle } from './adminCatalog';
import {
    adminListPageCount,
    adminListPageSize,
    adminListPaginationForUrl,
    adminListSkipTake,
    parseAdminListPage,
    parseAdminListPageSize,
} from './adminListPaginationSearch';
import type { AdminListPageSize } from './adminListPaginationSearch';

const route = adminStubRouteBySlug('support-requests');

export function adminSupportRequestsPageTitle(locale: Locale): string {
    return adminStubRouteTitle(route.slug, locale);
}
export function adminSupportRequestsPageDescription(locale: Locale): string {
    return adminStubRouteDescription(route.slug, locale);
}

const ADMIN_SUPPORT_REQUEST_SORT_FIELDS = [
    'lastMessageAt',
    'createdAt',
    'bookingDateTime',
] as const satisfies readonly GqlCAdminSupportRequestSortField[];
const DEFAULT_SORT_FIELD: GqlCAdminSupportRequestSortField = 'lastMessageAt';
const STATUS_SET = new Set<string>(['OPEN', 'RESOLVED']);

export type AdminSupportRequestsSearch = {
    q?: string;
    status?: GqlCSupportRequestStatus;
    /** When true (default), admin-unread rows pin first within the chosen sort. */
    unreadFirst?: boolean;
    sort?: GqlCAdminSupportRequestSortField;
    page?: number;
    pageSize?: AdminListPageSize;
};

function parseAdminSupportRequestsSort(value: unknown): GqlCAdminSupportRequestSortField | undefined {
    if (typeof value !== 'string') return undefined;
    if (!(ADMIN_SUPPORT_REQUEST_SORT_FIELDS as readonly string[]).includes(value)) return undefined;
    if (value === DEFAULT_SORT_FIELD) return undefined;
    return value as GqlCAdminSupportRequestSortField;
}

function resolveAdminSupportRequestsSort(search: AdminSupportRequestsSearch): GqlCAdminSupportRequestSortField {
    return search.sort ?? DEFAULT_SORT_FIELD;
}

function resolveAdminSupportRequestsUnreadFirst(search: AdminSupportRequestsSearch): boolean {
    return search.unreadFirst !== false;
}

function adminSupportRequestsSearchForUrl(search: AdminSupportRequestsSearch) {
    const sort = resolveAdminSupportRequestsSort(search);
    return {
        q: search.q,
        status: search.status,
        unreadFirst: resolveAdminSupportRequestsUnreadFirst(search) ? undefined : false,
        sort: sort === DEFAULT_SORT_FIELD ? undefined : sort,
        ...adminListPaginationForUrl(search),
    };
}

export function parseAdminSupportRequestsSearch(search: Record<string, unknown>): AdminSupportRequestsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const status =
        typeof search.status === 'string' && STATUS_SET.has(search.status) ? (search.status as GqlCSupportRequestStatus) : undefined;
    const unreadFirst = search.unreadFirst === false || search.unreadFirst === '0' || search.unreadFirst === 'false' ? false : undefined;
    const sort = parseAdminSupportRequestsSort(search.sort);
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    return { q, status, unreadFirst, sort, page, pageSize };
}

export function adminSupportRequestsPageVariables(search: AdminSupportRequestsSearch) {
    const { skip, take } = adminListSkipTake(search);
    const unreadFirst = resolveAdminSupportRequestsUnreadFirst(search);
    const sortField = resolveAdminSupportRequestsSort(search);
    const criterion = {
        skip,
        take,
        searchText: search.q,
        statuses: search.status ? [search.status] : undefined,
        sortField: sortField === DEFAULT_SORT_FIELD ? undefined : sortField,
        unreadFirst: unreadFirst ? undefined : false,
    };
    return {
        criterion,
        countsCriterion: {
            searchText: search.q,
            statuses: search.status ? [search.status] : undefined,
        },
    };
}

function adminSupportRequestsHasActiveFilters(search: AdminSupportRequestsSearch): boolean {
    return Boolean(search.q || search.status || search.unreadFirst === false || search.sort);
}

export function AdminSupportRequestsPage({
    data,
    search,
}: {
    data: GqlCAdminSupportRequestsPageQuery;
    search: AdminSupportRequestsSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/support-requests' });
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState<GqlCAdminSupportRequestsPageAdminFragment | null>(seedAdmin);

    useEffect(() => {
        setAdmin(seedAdmin);
    }, [seedAdmin]);

    useEffect(() => {
        if (!seedAdmin) return;
        const pageVariables = adminSupportRequestsPageVariables(search);
        const request = createRequest(AdminSupportRequestsPageUpdatesDocument, pageVariables);
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seedAdmin, search]);

    const supportRequests = admin?.supportRequests ?? [];
    const total = admin?.supportRequestsCounts[0] ?? 0;
    const page = search.page ?? 1;
    const pageSize = adminListPageSize(search);
    const pageCount = adminListPageCount(total, pageSize);
    const hasActiveFilters = adminSupportRequestsHasActiveFilters(search);

    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({
            search: adminSupportRequestsSearchForUrl({
                ...search,
                q: nextQ,
                page: undefined,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search]);

    function updateSearch(next: AdminSupportRequestsSearch) {
        void navigate({
            search: adminSupportRequestsSearchForUrl(next),
        });
    }

    function clearFilters() {
        setDraftQ('');
        updateSearch({
            ...search,
            q: undefined,
            status: undefined,
            unreadFirst: undefined,
            sort: undefined,
            page: undefined,
        });
    }

    return (
        <AdminPathPageChrome contentClassName="min-h-0 overflow-hidden gap-0">
            <AdminPinnedFooterLayout
                contentClassName="@container grid w-full content-start gap-6"
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
                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="search"
                        value={draftQ}
                        onChange={(event) => setDraftQ(event.target.value)}
                        placeholder={t(locale, 'admin', 'copy.searchSubjectNameOrId')}
                        aria-label={t(locale, 'admin', 'copy.searchSupportRequests')}
                        className="w-full min-w-0 basis-full @5xl:max-w-sm @5xl:flex-1 @5xl:basis-56"
                    />
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-3 @5xl:w-auto @5xl:flex-1">
                        <label className="flex shrink-0 items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{t(locale, 'admin', 'copy.status')}</span>
                            <Select
                                value={search.status ?? '__all__'}
                                onValueChange={(value) => {
                                    updateSearch({
                                        ...search,
                                        page: undefined,
                                        status: value != null && STATUS_SET.has(value) ? (value as GqlCSupportRequestStatus) : undefined,
                                    });
                                }}
                            >
                                <SelectTrigger size="sm" className="w-auto shrink-0" aria-label={t(locale, 'admin', 'copy.filterByStatus')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">{t(locale, 'admin', 'copy.allStatuses')}</SelectItem>
                                    <SelectItem value="OPEN">{t(locale, 'admin', 'copy.open')}</SelectItem>
                                    <SelectItem value="RESOLVED">{t(locale, 'admin', 'copy.resolved')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </label>

                        <Select
                            value={resolveAdminSupportRequestsSort(search)}
                            onValueChange={(value) => {
                                if (value == null || !(ADMIN_SUPPORT_REQUEST_SORT_FIELDS as readonly string[]).includes(value)) return;
                                updateSearch({
                                    ...search,
                                    page: undefined,
                                    sort: value === DEFAULT_SORT_FIELD ? undefined : (value as GqlCAdminSupportRequestSortField),
                                });
                            }}
                        >
                            <SelectTrigger size="sm" className="w-auto shrink-0" aria-label={t(locale, 'admin', 'copy.sort')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="lastMessageAt">{t(locale, 'admin', 'copy.newestMessage')}</SelectItem>
                                <SelectItem value="createdAt">{t(locale, 'admin', 'copy.requestCreated')}</SelectItem>
                                <SelectItem value="bookingDateTime">{t(locale, 'admin', 'copy.soonestBookingFirst')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <label className="flex shrink-0 items-center gap-2 text-sm">
                            <Checkbox
                                checked={resolveAdminSupportRequestsUnreadFirst(search)}
                                onCheckedChange={(checked) =>
                                    updateSearch({
                                        ...search,
                                        page: undefined,
                                        unreadFirst: checked === true ? undefined : false,
                                    })
                                }
                            />
                            {t(locale, 'admin', 'copy.unreadFirst')}
                        </label>

                        {hasActiveFilters ? (
                            <Button
                                type="button"
                                variant="link"
                                className="h-auto shrink-0 p-0 text-sm text-muted-foreground"
                                onClick={clearFilters}
                            >
                                {t(locale, 'admin', 'copy.clearFilters')}
                            </Button>
                        ) : null}

                        <p className="text-sm text-muted-foreground tabular-nums xl:ml-auto">
                            {inlineCopy(
                                {
                                    de: `${total} ${total === 1 ? 'Anfrage' : 'Anfragen'}`,
                                    en: `${total} ${total === 1 ? 'request' : 'requests'}`,
                                },
                                locale,
                            )}
                        </p>
                    </div>
                </div>

                {supportRequests.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.noSupportRequestsFound')}
                    </p>
                ) : (
                    <ul className="grid auto-rows-fr grid-cols-1 gap-2 @2xl:grid-cols-2 @5xl:grid-cols-3">
                        {supportRequests.map((request) => (
                            <li key={request.supportRequestId} className="min-h-0 min-w-0">
                                <SupportRequestSummaryCard
                                    request={request}
                                    unreadCount={request.adminUnreadNotificationCount}
                                    customerName={`${request.customer.firstName} ${request.customer.lastName}`.trim()}
                                    customerProfilePictureUrl={request.customer.profilePicture?.url ?? null}
                                    to="/{-$locale}/admin/support-requests/$supportRequestId"
                                    params={{ supportRequestId: request.supportRequestId }}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
