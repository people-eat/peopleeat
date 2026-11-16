import { Link, useNavigate } from '@tanstack/react-router';
import type { SortingState, Updater } from '@tanstack/react-table';
import { LayoutGridIcon, ListIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { t } from '../../../i18n/t';
import { userDisplayName } from '../../../shared';
import { bookingRequestPublicationReviewQueueStatuses, bookingRequestStatusLabel } from '../../../shared/bookingRequestStatus';
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
import type { Locale } from '../../utils/locale';
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

export function adminBookingRequestsPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.bookingRequests.title');
}
export function adminBookingRequestsPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.bookingRequests.description');
}

const ADMIN_BOOKING_REQUEST_PUBLICATION_STATUSES: GqlCBookingRequestPublicationStatus[] = [
    'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
    'PUBLICATION_AUTO_APPROVED',
    'PUBLICATION_APPROVED_BY_ADMIN',
    'PUBLICATION_DIRECT_TO_COOK',
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

const OPEN_FOR_REVIEW_STATUS_VALUE = '__open_review__';

export type AdminBookingRequestsSearch = {
    q?: string;
    publicationStatus?: GqlCBookingRequestPublicationStatus;
    status?: GqlCBookingRequestStatus;
    statuses?: GqlCBookingRequestStatus[];
    page?: number;
    pageSize?: AdminListPageSize;
    sort?: AdminBookingRequestsSortField;
    dir?: 'asc' | 'desc';
    /** Omit or `grid` = card grid (default). `list` = table. */
    view?: AdminBookingRequestsView;
    staleDirect?: boolean;
};

const GRID_SORT_OPTIONS = [
    { value: 'createdAt:desc', sort: 'createdAt' as const, dir: 'desc' as const },
    { value: 'createdAt:asc', sort: 'createdAt' as const, dir: 'asc' as const },
    { value: 'dateTime:desc', sort: 'dateTime' as const, dir: 'desc' as const },
    { value: 'dateTime:asc', sort: 'dateTime' as const, dir: 'asc' as const },
    { value: 'occasion:asc', sort: 'occasion' as const, dir: 'asc' as const },
    { value: 'occasion:desc', sort: 'occasion' as const, dir: 'desc' as const },
] as const;

function parseBookingRequestStatusList(value: unknown): GqlCBookingRequestStatus[] | undefined {
    const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
    const statuses = [
        ...new Set(
            raw
                .filter((item): item is string => typeof item === 'string')
                .map((item) => item.trim())
                .filter((item): item is GqlCBookingRequestStatus => STATUS_SET.has(item)),
        ),
    ];
    return statuses.length > 0 ? statuses : undefined;
}

function isOpenForReviewStatuses(statuses: readonly string[] | undefined): boolean {
    if (!statuses || statuses.length !== bookingRequestPublicationReviewQueueStatuses.length) return false;
    const selected = new Set(statuses);
    return bookingRequestPublicationReviewQueueStatuses.every((status) => selected.has(status));
}

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
    const statusList = parseBookingRequestStatusList(search.statuses);
    const singleStatus =
        typeof search.status === 'string' && STATUS_SET.has(search.status) ? (search.status as GqlCBookingRequestStatus) : undefined;
    const statuses = statusList && statusList.length > 1 ? statusList : undefined;
    const status = statuses ? undefined : (singleStatus ?? statusList?.[0]);
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_BOOKING_REQUESTS_SORT_FIELDS);
    const view = parseAdminBookingRequestsView(search.view);
    const staleDirect = search.staleDirect === true || search.staleDirect === 'true' ? true : undefined;
    return { q, publicationStatus, status, statuses, page, pageSize, sort, dir, view, staleDirect };
}

export function adminBookingRequestsPageVariables(search: AdminBookingRequestsSearch) {
    return {
        criterion: {
            ...adminListSkipTake(search),
            searchText: search.q,
            publicationStatuses: search.publicationStatus ? [search.publicationStatus] : undefined,
            statuses: search.statuses ?? (search.status ? [search.status] : undefined),
            staleDirect: search.staleDirect === true ? true : undefined,
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
        statuses: search.statuses,
        ...adminListPaginationForUrl(search),
        ...adminListSortSearchForUrl(search),
        ...adminBookingRequestsViewForUrl(search.view),
        staleDirect: search.staleDirect === true ? true : undefined,
    };
}

function adminBookingRequestsHasActiveFilters(search: AdminBookingRequestsSearch): boolean {
    return Boolean(search.q || search.publicationStatus || search.status || search.statuses || search.staleDirect);
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
        { value: undefined, label: t(locale, 'admin', 'copy.all') },
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
            statuses: undefined,
            staleDirect: undefined,
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
            venueCountry: request.exactEventAddress.country,
            venueCity: request.exactEventAddress.city,
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
                <Tabs value={search.publicationStatus ?? 'all'}>
                    <TabsList variant="line" aria-label={t(locale, 'admin', 'copy.publicationStatus')}>
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

                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="search"
                        value={draftQ}
                        onChange={(event) => setDraftQ(event.target.value)}
                        placeholder={t(locale, 'admin', 'copy.searchOccasionCustomerEmailOrLocation')}
                        aria-label={t(locale, 'admin', 'copy.searchBookingRequests')}
                        className="w-full min-w-0 basis-full @5xl:max-w-sm @5xl:flex-1 @5xl:basis-56"
                    />
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-3 @5xl:w-auto @5xl:flex-1">
                        <label className="flex shrink-0 items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{t(locale, 'admin', 'copy.status')}</span>
                            <Select
                                value={
                                    isOpenForReviewStatuses(search.statuses)
                                        ? OPEN_FOR_REVIEW_STATUS_VALUE
                                        : search.statuses && search.statuses.length > 1
                                          ? '__statuses__'
                                          : (search.status ?? '__all__')
                                }
                                onValueChange={(value) => {
                                    if (value === OPEN_FOR_REVIEW_STATUS_VALUE) {
                                        updateSearch({
                                            ...search,
                                            page: undefined,
                                            status: undefined,
                                            statuses: [...bookingRequestPublicationReviewQueueStatuses],
                                        });
                                        return;
                                    }
                                    updateSearch({
                                        ...search,
                                        page: undefined,
                                        status: value != null && STATUS_SET.has(value) ? (value as GqlCBookingRequestStatus) : undefined,
                                        statuses: undefined,
                                    });
                                }}
                            >
                                <SelectTrigger size="sm" className="w-auto shrink-0" aria-label={t(locale, 'admin', 'copy.filterByStatus')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">{t(locale, 'admin', 'copy.allStatuses')}</SelectItem>
                                    <SelectItem value={OPEN_FOR_REVIEW_STATUS_VALUE}>{t(locale, 'admin', 'copy.openForReview')}</SelectItem>
                                    {search.statuses && search.statuses.length > 1 && !isOpenForReviewStatuses(search.statuses) ? (
                                        <SelectItem value="__statuses__">
                                            {search.statuses.map((status) => bookingRequestStatusLabel(status, locale, 'admin')).join(', ')}
                                        </SelectItem>
                                    ) : null}
                                    {ADMIN_BOOKING_REQUEST_STATUSES.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {bookingRequestStatusLabel(status, locale, 'admin')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>

                        <Select value={gridSortValue(search)} onValueChange={onSortChange}>
                            <SelectTrigger size="sm" className="w-auto shrink-0" aria-label={t(locale, 'admin', 'copy.sort')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="createdAt:desc">{t(locale, 'admin', 'copy.newestFirst')}</SelectItem>
                                <SelectItem value="createdAt:asc">{t(locale, 'admin', 'copy.oldestFirst')}</SelectItem>
                                <SelectItem value="dateTime:desc">{t(locale, 'admin', 'copy.eventDateDescending')}</SelectItem>
                                <SelectItem value="dateTime:asc">{t(locale, 'admin', 'copy.eventDateAscending')}</SelectItem>
                                <SelectItem value="occasion:asc">{t(locale, 'admin', 'copy.occasionAZ')}</SelectItem>
                                <SelectItem value="occasion:desc">{t(locale, 'admin', 'copy.occasionZA')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            type="button"
                            size="sm"
                            variant={search.staleDirect === true ? 'default' : 'outline'}
                            className="shrink-0"
                            onClick={() =>
                                updateSearch({
                                    ...search,
                                    staleDirect: search.staleDirect === true ? undefined : true,
                                    page: undefined,
                                })
                            }
                        >
                            {t(locale, 'admin', 'copy.staleDirect')}
                        </Button>

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

                        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border p-0.5" role="group">
                            <Button
                                type="button"
                                size="icon-sm"
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                aria-label={t(locale, 'admin', 'copy.cardView')}
                                aria-pressed={viewMode === 'grid'}
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGridIcon />
                            </Button>
                            <Button
                                type="button"
                                size="icon-sm"
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                aria-label={t(locale, 'admin', 'copy.listView')}
                                aria-pressed={viewMode === 'list'}
                                onClick={() => setViewMode('list')}
                            >
                                <ListIcon />
                            </Button>
                        </div>

                        <p className="text-sm text-muted-foreground tabular-nums xl:ml-auto">
                            {t(locale, 'admin', 'copy.requestCount', { count: total })}
                        </p>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <AdminBookingRequestsDataTable data={tableRows} sorting={sorting} onSortingChange={onSortingChange} />
                ) : bookingRequests.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.noBookingRequestsFound')}
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
