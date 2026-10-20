import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Input } from '../../components/base/input';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { SupportRequestSummaryCard } from '../../components/SupportRequestSummaryCard';
import type {
    GqlCAdminSupportRequestsPageAdminFragment,
    GqlCAdminSupportRequestsPageQuery,
    GqlCSupportRequestStatus,
} from '../../graphql/generated';
import { AdminSupportRequestsPageUpdatesDocument } from '../../graphql/generated';
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

const route = adminStubRouteBySlug('support-requests');

export const adminSupportRequestsPageTitle = route.title;
export const adminSupportRequestsPageDescription = route.description;

export type AdminSupportRequestsSearch = {
    q?: string;
    status?: GqlCSupportRequestStatus;
    unread?: boolean;
    page?: number;
    pageSize?: AdminListPageSize;
};

function adminSupportRequestsSearchForUrl(search: AdminSupportRequestsSearch) {
    return {
        q: search.q,
        status: search.status,
        unread: search.unread || undefined,
        ...adminListPaginationForUrl(search),
    };
}

export function parseAdminSupportRequestsSearch(search: Record<string, unknown>): AdminSupportRequestsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const status = search.status === 'OPEN' || search.status === 'RESOLVED' ? search.status : undefined;
    const unread = search.unread === true || search.unread === '1' || search.unread === 'true' ? true : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    return { q, status, unread, page, pageSize };
}

export function adminSupportRequestsPageVariables(search: AdminSupportRequestsSearch) {
    const { skip, take } = adminListSkipTake(search);
    const criterion = {
        skip,
        take,
        searchText: search.q,
        statuses: search.status ? [search.status] : undefined,
        hasAdminUnread: search.unread ? true : undefined,
    };
    return {
        criterion,
        countsCriterion: {
            searchText: search.q,
            statuses: search.status ? [search.status] : undefined,
            hasAdminUnread: search.unread ? true : undefined,
        },
    };
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

    const statusTab = search.unread ? 'unread' : search.status === 'RESOLVED' ? 'resolved' : search.status === 'OPEN' ? 'open' : 'all';

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
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminSupportRequestsPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{adminSupportRequestsPageDescription[locale]}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        value={draftQ}
                        onChange={(event) => setDraftQ(event.target.value)}
                        placeholder={{ de: 'Suchen…', en: 'Search…' }[locale]}
                        className="max-w-sm"
                    />
                    <Tabs
                        value={statusTab}
                        onValueChange={(value) => {
                            if (value === 'unread') updateSearch({ ...search, status: undefined, unread: true, page: undefined });
                            else if (value === 'open') updateSearch({ ...search, status: 'OPEN', unread: undefined, page: undefined });
                            else if (value === 'resolved')
                                updateSearch({ ...search, status: 'RESOLVED', unread: undefined, page: undefined });
                            else updateSearch({ ...search, status: undefined, unread: undefined, page: undefined });
                        }}
                    >
                        <TabsList>
                            <TabsTrigger value="all">{{ de: 'Alle', en: 'All' }[locale]}</TabsTrigger>
                            <TabsTrigger value="open">{{ de: 'Offen', en: 'Open' }[locale]}</TabsTrigger>
                            <TabsTrigger value="unread">{{ de: 'Ungelesen', en: 'Unread' }[locale]}</TabsTrigger>
                            <TabsTrigger value="resolved">{{ de: 'Erledigt', en: 'Resolved' }[locale]}</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {supportRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{{ de: 'Keine Support-Anfragen.', en: 'No support requests.' }[locale]}</p>
                ) : (
                    <ul className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {supportRequests.map((request) => (
                            <li key={request.supportRequestId} className="min-w-0">
                                <SupportRequestSummaryCard
                                    request={request}
                                    unreadCount={request.adminUnreadNotificationCount}
                                    customerName={`${request.customer.firstName} ${request.customer.lastName}`.trim()}
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
