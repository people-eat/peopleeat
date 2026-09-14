import { Link, useNavigate } from '@tanstack/react-router';
import type { SortingState, Updater } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import type { GqlCAdminPromoCodesPageQuery } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { adminStubRouteBySlug } from './adminCatalog';
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
import { adminPromoCodesSectionTo } from './adminPromoCodes';
import { ADMIN_PROMO_CODES_SORT_FIELDS } from './adminPromoCodesColumns';
import type { AdminPromoCodesSortField } from './adminPromoCodesColumns';
import { AdminPromoCodesDataTable } from './AdminPromoCodesDataTable';

const route = adminStubRouteBySlug('promo-codes');

export const adminPromoCodesPageTitle = route.title;
export const adminPromoCodesPageDescription = route.description;

export type AdminPromoCodesSearch = {
    q?: string;
    page?: number;
    pageSize?: AdminListPageSize;
    sort?: AdminPromoCodesSortField;
    dir?: 'asc' | 'desc';
};

function adminPromoCodesSearchForUrl(search: AdminPromoCodesSearch) {
    return {
        q: search.q,
        ...adminListPaginationForUrl(search),
        ...adminListSortSearchForUrl(search),
    };
}

export function parseAdminPromoCodesSearch(search: Record<string, unknown>): AdminPromoCodesSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_PROMO_CODES_SORT_FIELDS);
    return { q, page, pageSize, sort, dir };
}

export function adminPromoCodesPageVariables(search: AdminPromoCodesSearch) {
    return {
        criterion: {
            ...adminListSkipTake(search),
            searchText: search.q,
            ...adminListSortToCriterion(search),
        },
    };
}

export function AdminPromoCodesPage({ data, search }: { data: GqlCAdminPromoCodesPageQuery; search: AdminPromoCodesSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/promo-codes' });
    const admin = data.currentSession.user?.admin;
    const promoCodes = admin?.promoCodes ?? [];
    const total = admin?.promoCodesCounts[0] ?? 0;
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
            search: adminPromoCodesSearchForUrl({
                ...search,
                q: nextQ,
                page: undefined,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search]);

    function updateSearch(next: AdminPromoCodesSearch) {
        void navigate({
            search: adminPromoCodesSearchForUrl(next),
        });
    }

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSort = adminListSortFromSortingState(updater, sorting, ADMIN_PROMO_CODES_SORT_FIELDS);
        updateSearch({
            ...search,
            page: undefined,
            sort: nextSort.sort,
            dir: nextSort.dir,
        });
    }

    const tableRows = promoCodes.map((code) => ({
        promoCodeId: code.promoCodeId,
        redeemCode: code.redeemCode,
        amountCents: code.amountCents,
        minimumTotalAmountCustomerCents: code.minimumTotalAmountCustomerCents ?? null,
        expiresAt: code.expiresAt,
        createdAt: code.createdAt,
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center sm:flex-1">
                        <Input
                            type="search"
                            value={draftQ}
                            onChange={(event) => setDraftQ(event.target.value)}
                            placeholder={{ de: 'Einlöscode suchen…', en: 'Search redeem code…' }[locale]}
                            aria-label={{ de: 'Promo-Codes suchen', en: 'Search promo codes' }[locale]}
                        />
                        <p className="text-sm text-muted-foreground tabular-nums">
                            {
                                {
                                    de: `${total} ${total === 1 ? 'Promo-Code' : 'Promo-Codes'}`,
                                    en: `${total} ${total === 1 ? 'promo code' : 'promo codes'}`,
                                }[locale]
                            }
                        </p>
                    </div>
                    <Button asChild>
                        <Link to={adminPromoCodesSectionTo('create')}>
                            <PlusIcon aria-hidden />
                            {{ de: 'Anlegen', en: 'Create' }[locale]}
                        </Link>
                    </Button>
                </div>

                <AdminPromoCodesDataTable data={tableRows} sorting={sorting} onSortingChange={onSortingChange} />
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
