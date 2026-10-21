import { Link, useNavigate } from '@tanstack/react-router';
import type { SortingState, Updater } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminCallListItemKind, GqlCAdminCallsPageQuery, GqlCCookCallSlotBookingActor } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { adminCallKindLabel } from './AdminCallsAttentionBoard';
import type { AdminCallsSortField, AdminCallsTableRow } from './adminCallsColumns';
import { ADMIN_CALLS_SORT_FIELDS, adminCallInitiatorLabel } from './adminCallsColumns';
import { AdminCallsDataTable } from './AdminCallsDataTable';
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

export const adminCallsPageTitle = { de: 'Anruf-Liste', en: 'Call list' } as const;
export const adminCallsPageDescription = {
    de: 'Gesamter Anruf-Verkehr inkl. Ablehnungen und Stornierungen.',
    en: 'Full call traffic including declines and cancellations.',
} as const;

const ADMIN_CALLS_KIND_TABS: Array<GqlCAdminCallListItemKind | undefined> = [
    undefined,
    'LIVE',
    'PENDING',
    'UPCOMING',
    'DECLINED',
    'CANCELED',
    'RECENT_SLOT',
    'RECENT_ROOM',
];

export type AdminCallsSearch = {
    q?: string;
    kind?: GqlCAdminCallListItemKind;
    initiator?: GqlCCookCallSlotBookingActor;
    cookId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: AdminListPageSize;
    sort?: AdminCallsSortField;
    dir?: 'asc' | 'desc';
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const KIND_SET = new Set<string>(['LIVE', 'PENDING', 'UPCOMING', 'RECENT_ROOM', 'RECENT_SLOT', 'DECLINED', 'CANCELED']);

function parseIsoDateOnly(value: unknown): string | undefined {
    if (typeof value !== 'string' || !ISO_DATE.test(value)) return undefined;
    return value;
}

function adminCallsSearchForUrl(search: AdminCallsSearch) {
    return {
        q: search.q,
        kind: search.kind,
        initiator: search.initiator,
        cookId: search.cookId,
        from: search.from,
        to: search.to,
        ...adminListPaginationForUrl(search),
        ...adminListSortSearchForUrl(search, 'occurredAt'),
    };
}

export function parseAdminCallsSearch(search: Record<string, unknown>): AdminCallsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const kind = typeof search.kind === 'string' && KIND_SET.has(search.kind) ? (search.kind as GqlCAdminCallListItemKind) : undefined;
    const initiator = search.initiator === 'CUSTOMER' || search.initiator === 'COOK' ? search.initiator : undefined;
    const cookId = typeof search.cookId === 'string' && search.cookId.trim().length > 0 ? search.cookId.trim() : undefined;
    const from = parseIsoDateOnly(search.from);
    const to = parseIsoDateOnly(search.to);
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_CALLS_SORT_FIELDS, 'occurredAt');
    return { q, kind, initiator, cookId, from, to, page, pageSize, sort, dir };
}

export function adminCallsPageVariables(search: AdminCallsSearch) {
    const range =
        search.from && search.to
            ? {
                  startDateTime: new Date(`${search.from}T00:00:00`).toISOString(),
                  endDateTime: new Date(new Date(`${search.to}T00:00:00`).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
              }
            : undefined;

    return {
        criterion: {
            ...adminListSkipTake(search),
            searchText: search.q,
            kinds: search.kind ? [search.kind] : undefined,
            initiators: search.initiator ? [search.initiator] : undefined,
            cookIds: search.cookId ? [search.cookId] : undefined,
            range,
            ...adminListSortToCriterion(search, 'occurredAt'),
        },
    };
}

function toTableRow(
    item: NonNullable<NonNullable<GqlCAdminCallsPageQuery['currentSession']['user']>['admin']>['callTraffic'][number],
): AdminCallsTableRow {
    const slot = item.callSlotBooking;
    const room = item.callRoom;
    const occurredAt = slot?.startAt ?? room?.startedAt ?? slot?.createdAt ?? new Date(0).toISOString();
    const reason = slot?.declineReason ?? slot?.canceledReason ?? null;
    return {
        kind: item.kind,
        bookingRequestId: item.bookingRequestId,
        bookingRequestOfferId: item.bookingRequestOfferId,
        bookingRequestOfferCallRoomId: room?.bookingRequestOfferCallRoomId ?? slot?.videoCallRoomId ?? null,
        cookDisplayName: item.cookDisplayName,
        customerDisplayName: item.customerDisplayName,
        occasion: item.occasion,
        occurredAt,
        initiator: slot?.initiator ?? null,
        reason,
    };
}

export function AdminCallsPage({ data, search }: { data: GqlCAdminCallsPageQuery; search: AdminCallsSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/calls/list' });
    const admin = data.currentSession.user?.admin;
    const traffic = admin?.callTraffic ?? [];
    const total = admin?.callTrafficCounts[0] ?? 0;
    const page = search.page ?? 1;
    const pageSize = adminListPageSize(search);
    const pageCount = adminListPageCount(total, pageSize);
    const sorting = adminListSortingState(search, 'occurredAt');
    const rows = traffic.map(toTableRow);

    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({
            search: adminCallsSearchForUrl({
                ...search,
                q: nextQ,
                page: undefined,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search]);

    function updateSearch(next: AdminCallsSearch) {
        void navigate({
            search: adminCallsSearchForUrl(next),
        });
    }

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSort = adminListSortFromSortingState(updater, sorting, ADMIN_CALLS_SORT_FIELDS, 'occurredAt');
        updateSearch({ ...search, page: undefined, sort: nextSort.sort, dir: nextSort.dir });
    }

    const kindTabs = ADMIN_CALLS_KIND_TABS.map((kind) => ({
        value: kind,
        label: kind ? adminCallKindLabel(kind, locale) : { de: 'Alle', en: 'All' }[locale],
    }));

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
                    <TabsList variant="line" aria-label={{ de: 'Anruf-Status', en: 'Call status' }[locale]}>
                        {kindTabs.map((tab) => (
                            <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/calls/list"
                                    search={adminCallsSearchForUrl({
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
                        placeholder={{ de: 'Anlass, Koch oder Kunde suchen…', en: 'Search occasion, cook, or customer…' }[locale]}
                        aria-label={{ de: 'Anruf-Verkehr suchen', en: 'Search call traffic' }[locale]}
                    />
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {
                            {
                                de: `${total} ${total === 1 ? 'Eintrag' : 'Einträge'}`,
                                en: `${total} ${total === 1 ? 'entry' : 'entries'}`,
                            }[locale]
                        }
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{{ de: 'Initiator', en: 'Initiator' }[locale]}</span>
                        <Select
                            value={search.initiator ?? '__all__'}
                            onValueChange={(value) => {
                                updateSearch({
                                    ...search,
                                    page: undefined,
                                    initiator: value === 'CUSTOMER' || value === 'COOK' ? value : undefined,
                                });
                            }}
                        >
                            <SelectTrigger size="sm" aria-label={{ de: 'Initiator filtern', en: 'Filter initiator' }[locale]}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">{{ de: 'Alle', en: 'All' }[locale]}</SelectItem>
                                <SelectItem value="CUSTOMER">{adminCallInitiatorLabel('CUSTOMER', locale)}</SelectItem>
                                <SelectItem value="COOK">{adminCallInitiatorLabel('COOK', locale)}</SelectItem>
                            </SelectContent>
                        </Select>
                    </label>
                    {search.cookId ? (
                        <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-sm text-muted-foreground"
                            onClick={() => updateSearch({ ...search, cookId: undefined, page: undefined })}
                        >
                            {{ de: 'Koch-Filter entfernen', en: 'Clear cook filter' }[locale]}
                        </Button>
                    ) : null}
                </div>

                <AdminCallsDataTable data={rows} sorting={sorting} onSortingChange={onSortingChange} />
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
