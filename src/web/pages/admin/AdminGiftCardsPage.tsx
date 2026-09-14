import { Link, useNavigate } from '@tanstack/react-router';
import type { SortingState, Updater } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Input } from '../../components/base/input';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminGiftCardsPageQuery, GqlCGiftCardPaymentStatus } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { ADMIN_GIFT_CARDS_SORT_FIELDS, adminGiftCardPaymentStatusLabel } from './adminGiftCardsColumns';
import type { AdminGiftCardsSortField } from './adminGiftCardsColumns';
import { AdminGiftCardsDataTable } from './AdminGiftCardsDataTable';
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

export const adminGiftCardsPageTitle = { de: 'Gutscheinliste', en: 'Gift card list' } as const;
export const adminGiftCardsPageDescription = {
    de: 'Gekaufte Gutscheine durchsuchen und einsehen.',
    en: 'Browse and inspect purchased gift cards.',
} as const;

const ADMIN_GIFT_CARDS_ALL_STATUSES: GqlCGiftCardPaymentStatus[] = ['PREPARED', 'PAYED'];

export type AdminGiftCardsSearch = {
    q?: string;
    status?: GqlCGiftCardPaymentStatus;
    page?: number;
    pageSize?: AdminListPageSize;
    sort?: AdminGiftCardsSortField;
    dir?: 'asc' | 'desc';
};

function adminGiftCardsSearchForUrl(search: AdminGiftCardsSearch) {
    return {
        q: search.q,
        status: search.status,
        ...adminListPaginationForUrl(search),
        ...adminListSortSearchForUrl(search),
    };
}

export function parseAdminGiftCardsSearch(search: Record<string, unknown>): AdminGiftCardsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const status = search.status === 'PREPARED' || search.status === 'PAYED' ? search.status : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_GIFT_CARDS_SORT_FIELDS);
    return { q, status, page, pageSize, sort, dir };
}

export function adminGiftCardsPageVariables(search: AdminGiftCardsSearch) {
    return {
        criterion: {
            ...adminListSkipTake(search),
            searchText: search.q,
            paymentStatuses: search.status ? [search.status] : ADMIN_GIFT_CARDS_ALL_STATUSES,
            ...adminListSortToCriterion(search),
        },
    };
}

export function AdminGiftCardsPage({ data, search }: { data: GqlCAdminGiftCardsPageQuery; search: AdminGiftCardsSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/gift-cards/list' });
    const admin = data.currentSession.user?.admin;
    const giftCards = admin?.giftCards ?? [];
    const total = admin?.giftCardsCounts[0] ?? 0;
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
            search: adminGiftCardsSearchForUrl({
                ...search,
                q: nextQ,
                page: undefined,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search]);

    function updateSearch(next: AdminGiftCardsSearch) {
        void navigate({
            search: adminGiftCardsSearchForUrl(next),
        });
    }

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSort = adminListSortFromSortingState(updater, sorting, ADMIN_GIFT_CARDS_SORT_FIELDS);
        updateSearch({
            ...search,
            page: undefined,
            sort: nextSort.sort,
            dir: nextSort.dir,
        });
    }

    const statusTabs: { value: GqlCGiftCardPaymentStatus | undefined; label: string }[] = [
        { value: undefined, label: { de: 'Alle', en: 'All' }[locale] },
        ...ADMIN_GIFT_CARDS_ALL_STATUSES.map((status) => ({
            value: status,
            label: adminGiftCardPaymentStatusLabel(status, locale),
        })),
    ];

    const tableRows = giftCards.map((card) => ({
        giftCardId: card.giftCardId,
        createdAt: card.createdAt,
        originalBalanceCents: card.originalBalanceCents,
        paymentStatus: card.paymentStatus,
        buyerEmail: card.buyerEmail,
        recipientName: card.recipientName,
        occasion: card.occasion,
        redeemCode: card.redeemCode,
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
                <Tabs value={search.status ?? 'all'}>
                    <TabsList variant="line" aria-label={{ de: 'Zahlungsstatus', en: 'Payment status' }[locale]}>
                        {statusTabs.map((tab) => (
                            <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/gift-cards/list"
                                    search={adminGiftCardsSearchForUrl({
                                        ...search,
                                        status: tab.value,
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
                        placeholder={{ de: 'E-Mail, Name oder Code suchen…', en: 'Search email, name, or code…' }[locale]}
                        aria-label={{ de: 'Gutscheine suchen', en: 'Search gift cards' }[locale]}
                    />
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {
                            {
                                de: `${total} ${total === 1 ? 'Gutschein' : 'Gutscheine'}`,
                                en: `${total} ${total === 1 ? 'gift card' : 'gift cards'}`,
                            }[locale]
                        }
                    </p>
                </div>

                <AdminGiftCardsDataTable data={tableRows} sorting={sorting} onSortingChange={onSortingChange} />
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
