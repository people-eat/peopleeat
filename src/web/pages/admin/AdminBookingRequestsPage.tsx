import { Link, useNavigate } from '@tanstack/react-router';
import type { SortingState, Updater } from '@tanstack/react-table';
import { LayoutGridIcon, ListIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { userDisplayName } from '../../../shared';
import { bookingRequestStatusLabel } from '../../../shared/bookingRequestStatus';
import { AdminBookingRequestListCard } from '../../components/AdminBookingRequestListCard';
import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type {
    GqlCAdminBookingRequestsPageQuery,
    GqlCBookingRequestPublicationStatus,
    GqlCBookingRequestStatus,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { ADMIN_BOOKING_REQUESTS_SORT_FIELDS, adminBookingRequestPublicationStatusLabel } from './adminBookingRequestsColumns';
import type { AdminBookingRequestsSortField } from './adminBookingRequestsColumns';
import { AdminBookingRequestsDataTable } from './AdminBookingRequestsDataTable';
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

export const adminBookingRequestsPageTitle = { de: 'Liste der Buchungsanfragen', en: 'Booking request list' } as const;
export const adminBookingRequestsPageDescription = {
    de: 'Buchungsanfragen durchsuchen und einsehen.',
    en: 'Browse and inspect booking requests.',
} as const;

const ADMIN_BOOKING_REQUEST_PUBLICATION_STATUSES: GqlCBookingRequestPublicationStatus[] = [
    'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
    'PUBLICATION_AUTO_APPROVED',
    'PUBLICATION_APPROVED_BY_ADMIN',
];

const ADMIN_BOOKING_REQUEST_STATUSES: GqlCBookingRequestStatus[] = [
    'WAITING_FOR_OFFERS',
    'OFFERS_WAITING_FOR_REVIEW',
    'DEPOSIT_PAYMENT_PENDING',
    'PAYMENT_PULL_PENDING',
    'EVENT_PENDING',
    'COMPLETED',
    'EXPIRED',
    'CANCELED',
];

const PUBLICATION_STATUS_SET = new Set<string>(ADMIN_BOOKING_REQUEST_PUBLICATION_STATUSES);
const STATUS_SET = new Set<string>(ADMIN_BOOKING_REQUEST_STATUSES);

export type AdminBookingRequestsView = 'grid' | 'list';

export type AdminBookingRequestsSearch = {
    q?: string;
    publicationStatus?: GqlCBookingRequestPublicationStatus;
    status?: GqlCBookingRequestStatus;
    page?: number;
    pageSize?: AdminListPageSize;
    sort?: AdminBookingRequestsSortField;
    dir?: 'asc' | 'desc';
    /** Omit or `grid` = card grid (default). `list` = table. */
    view?: AdminBookingRequestsView;
};

const GRID_SORT_OPTIONS = [
    { value: 'createdAt:desc', sort: 'createdAt' as const, dir: 'desc' as const },
    { value: 'createdAt:asc', sort: 'createdAt' as const, dir: 'asc' as const },
    { value: 'dateTime:desc', sort: 'dateTime' as const, dir: 'desc' as const },
    { value: 'dateTime:asc', sort: 'dateTime' as const, dir: 'asc' as const },
    { value: 'occasion:asc', sort: 'occasion' as const, dir: 'asc' as const },
    { value: 'occasion:desc', sort: 'occasion' as const, dir: 'desc' as const },
] as const;

function parseAdminBookingRequestsView(value: unknown): AdminBookingRequestsView | undefined {
    if (value === 'list') return 'list';
    if (value === 'grid') return 'grid';
    return undefined;
}

export function parseAdminBookingRequestsSearch(search: Record<string, unknown>): AdminBookingRequestsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const publicationStatus =
        typeof search.publicationStatus === 'string' && PUBLICATION_STATUS_SET.has(search.publicationStatus)
            ? (search.publicationStatus as GqlCBookingRequestPublicationStatus)
            : undefined;
    const status =
        typeof search.status === 'string' && STATUS_SET.has(search.status) ? (search.status as GqlCBookingRequestStatus) : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_BOOKING_REQUESTS_SORT_FIELDS);
    const view = parseAdminBookingRequestsView(search.view);
    return { q, publicationStatus, status, page, pageSize, sort, dir, view };
}

export function adminBookingRequestsPageVariables(search: AdminBookingRequestsSearch) {
    return {
        criterion: {
            ...adminListSkipTake(search),
            searchText: search.q,
            publicationStatuses: search.publicationStatus ? [search.publicationStatus] : undefined,
            statuses: search.status ? [search.status] : undefined,
            ...adminListSortToCriterion(search),
        },
    };
}

function adminBookingRequestsViewForUrl(view: AdminBookingRequestsView | undefined): { view?: 'list' } {
    return view === 'list' ? { view: 'list' } : {};
}

function resolveAdminBookingRequestsView(search: AdminBookingRequestsSearch): AdminBookingRequestsView {
    return search.view === 'list' ? 'list' : 'grid';
}

function gridSortValue(search: AdminBookingRequestsSearch): string {
    const sort = search.sort ?? 'createdAt';
    const dir = search.dir ?? 'desc';
    return `${sort}:${dir}`;
}

function adminBookingRequestsSearchForUrl(search: AdminBookingRequestsSearch) {
    return {
        q: search.q,
        publicationStatus: search.publicationStatus,
        status: search.status,
        ...adminListPaginationForUrl(search),
        ...adminListSortSearchForUrl(search),
        ...adminBookingRequestsViewForUrl(search.view),
    };
}

function adminBookingRequestsHasActiveFilters(search: AdminBookingRequestsSearch): boolean {
    return Boolean(search.q || search.publicationStatus || search.status);
}

export function AdminBookingRequestsPage({
    data,
    search,
}: {
    data: GqlCAdminBookingRequestsPageQuery;
    search: AdminBookingRequestsSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/booking-requests/list' });
    const admin = data.currentSession.user?.admin;
    const bookingRequests = admin?.bookingRequests ?? [];
    const total = admin?.bookingRequestsCounts[0] ?? 0;
    const page = search.page ?? 1;
    const pageSize = adminListPageSize(search);
    const pageCount = adminListPageCount(total, pageSize);
    const sorting = adminListSortingState(search);
    const viewMode = resolveAdminBookingRequestsView(search);
    const hasActiveFilters = adminBookingRequestsHasActiveFilters(search);

    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({
            search: adminBookingRequestsSearchForUrl({
                ...search,
                q: nextQ,
                page: undefined,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search]);

    function updateSearch(next: AdminBookingRequestsSearch) {
        void navigate({
            search: adminBookingRequestsSearchForUrl(next),
        });
    }

    const publicationTabs: { value: GqlCBookingRequestPublicationStatus | undefined; label: string }[] = [
        { value: undefined, label: { de: 'Alle', en: 'All' }[locale] },
        ...ADMIN_BOOKING_REQUEST_PUBLICATION_STATUSES.map((status) => ({
            value: status,
            label: adminBookingRequestPublicationStatusLabel(status, locale),
        })),
    ];

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSort = adminListSortFromSortingState(updater, sorting, ADMIN_BOOKING_REQUESTS_SORT_FIELDS);
        updateSearch({
            ...search,
            page: undefined,
            sort: nextSort.sort,
            dir: nextSort.dir,
        });
    }

    function setViewMode(nextView: AdminBookingRequestsView) {
        updateSearch({
            ...search,
            view: nextView === 'grid' ? undefined : nextView,
        });
    }

    function onSortChange(value: string | null) {
        if (value == null) return;
        const option = GRID_SORT_OPTIONS.find((entry) => entry.value === value);
        if (!option) return;
        updateSearch({
            ...search,
            page: undefined,
            sort: option.sort,
            dir: option.dir,
        });
    }

    function clearFilters() {
        setDraftQ('');
        updateSearch({
            ...search,
            q: undefined,
            publicationStatus: undefined,
            status: undefined,
            page: undefined,
        });
    }

    const tableRows = bookingRequests.map((request) => {
        const location =
            request.exactEventAddress.city.trim().length > 0 ? request.exactEventAddress.city : request.exactEventAddress.displayText;
        return {
            bookingRequestId: request.bookingRequestId,
            createdAt: request.createdAt,
            dateTime: request.dateTime,
            occasion: request.occasion,
            status: request.status,
            publicationStatus: request.publicationStatus,
            location,
            offerCount: request.offers.length,
            customerName: userDisplayName(request.customer),
            customerEmail: request.customer.emailAddress,
            cookName: request.cook?.user ? userDisplayName(request.cook.user) : null,
        };
    });

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
                <Tabs value={search.publicationStatus ?? 'all'}>
                    <TabsList variant="line" aria-label={{ de: 'Veröffentlichungsstatus', en: 'Publication status' }[locale]}>
                        {publicationTabs.map((tab) => (
                            <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/booking-requests/list"
                                    search={adminBookingRequestsSearchForUrl({
                                        ...search,
                                        publicationStatus: tab.value,
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
                                de: 'Anlass, Kunde, E-Mail oder Ort suchen…',
                                en: 'Search occasion, customer, email, or location…',
                            }[locale]
                        }
                        aria-label={{ de: 'Buchungsanfragen suchen', en: 'Search booking requests' }[locale]}
                    />
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {
                            {
                                de: `${total} ${total === 1 ? 'Anfrage' : 'Anfragen'}`,
                                en: `${total} ${total === 1 ? 'request' : 'requests'}`,
                            }[locale]
                        }
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{{ de: 'Status', en: 'Status' }[locale]}</span>
                        <Select
                            value={search.status ?? '__all__'}
                            onValueChange={(value) => {
                                updateSearch({
                                    ...search,
                                    page: undefined,
                                    status: value != null && STATUS_SET.has(value) ? (value as GqlCBookingRequestStatus) : undefined,
                                });
                            }}
                        >
                            <SelectTrigger size="sm" aria-label={{ de: 'Status filtern', en: 'Filter by status' }[locale]}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">{{ de: 'Alle Status', en: 'All statuses' }[locale]}</SelectItem>
                                {ADMIN_BOOKING_REQUEST_STATUSES.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {bookingRequestStatusLabel(status, locale, 'admin')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>

                    <Select value={gridSortValue(search)} onValueChange={onSortChange}>
                        <SelectTrigger size="sm" aria-label={{ de: 'Sortierung', en: 'Sort' }[locale]}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="createdAt:desc">{{ de: 'Neueste zuerst', en: 'Newest first' }[locale]}</SelectItem>
                            <SelectItem value="createdAt:asc">{{ de: 'Älteste zuerst', en: 'Oldest first' }[locale]}</SelectItem>
                            <SelectItem value="dateTime:desc">
                                {{ de: 'Termin absteigend', en: 'Event date descending' }[locale]}
                            </SelectItem>
                            <SelectItem value="dateTime:asc">{{ de: 'Termin aufsteigend', en: 'Event date ascending' }[locale]}</SelectItem>
                            <SelectItem value="occasion:asc">{{ de: 'Anlass A–Z', en: 'Occasion A–Z' }[locale]}</SelectItem>
                            <SelectItem value="occasion:desc">{{ de: 'Anlass Z–A', en: 'Occasion Z–A' }[locale]}</SelectItem>
                        </SelectContent>
                    </Select>

                    {hasActiveFilters ? (
                        <Button type="button" variant="link" className="h-auto p-0 text-sm text-muted-foreground" onClick={clearFilters}>
                            {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                        </Button>
                    ) : null}

                    <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5" role="group">
                        <Button
                            type="button"
                            size="icon-sm"
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            aria-label={{ de: 'Kartenansicht', en: 'Card view' }[locale]}
                            aria-pressed={viewMode === 'grid'}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGridIcon />
                        </Button>
                        <Button
                            type="button"
                            size="icon-sm"
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            aria-label={{ de: 'Listenansicht', en: 'List view' }[locale]}
                            aria-pressed={viewMode === 'list'}
                            onClick={() => setViewMode('list')}
                        >
                            <ListIcon />
                        </Button>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <AdminBookingRequestsDataTable data={tableRows} sorting={sorting} onSortingChange={onSortingChange} />
                ) : bookingRequests.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                        {{ de: 'Keine Buchungsanfragen gefunden.', en: 'No booking requests found.' }[locale]}
                    </p>
                ) : (
                    <ul className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {bookingRequests.map((request) => (
                            <li key={request.bookingRequestId} className="min-h-0">
                                <AdminBookingRequestListCard request={request} />
                            </li>
                        ))}
                    </ul>
                )}
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
