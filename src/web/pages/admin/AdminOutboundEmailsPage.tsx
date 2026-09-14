import { Link, useNavigate } from '@tanstack/react-router';
import type { SortingState, Updater } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Input } from '../../components/base/input';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type {
    GqlCAdminOutboundEmailLifecycleStatus,
    GqlCAdminOutboundEmailPurpose,
    GqlCAdminOutboundEmailsPageQuery,
} from '../../graphql/generated';
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
import {
    ADMIN_OUTBOUND_EMAILS_SORT_FIELDS,
    adminOutboundEmailLifecycleStatusLabel,
    adminOutboundEmailPurposeLabel,
} from './adminOutboundEmailsColumns';
import type { AdminOutboundEmailsSortField } from './adminOutboundEmailsColumns';
import { AdminOutboundEmailsDataTable } from './AdminOutboundEmailsDataTable';

export const adminOutboundEmailsPageTitle = { de: 'E-Mail-Liste', en: 'Email list' } as const;
export const adminOutboundEmailsPageDescription = {
    de: 'Ausgehende Transaktions-E-Mails durchsuchen und einsehen.',
    en: 'Browse and inspect outbound transactional emails.',
} as const;

const ADMIN_OUTBOUND_EMAILS_ALL_PURPOSES: GqlCAdminOutboundEmailPurpose[] = [
    'GIFT_CARD_PURCHASED',
    'AUTH_EMAIL_OTP',
    'EMAIL_ADDRESS_UPDATE_CONFIRM',
    'CALL_SLOT_BOOKING_REQUEST',
    'CALL_SLOT_BOOKING_CONFIRM',
    'CALL_SLOT_BOOKING_DECLINE',
    'CALL_SLOT_BOOKING_CANCEL',
    'CALL_SLOT_BOOKING_REMINDER',
    'BOOKING_REQUEST_COOK_NOTIFY',
    'BOOKING_REQUEST_CREATED',
    'BOOKING_REQUEST_UPDATED',
    'BOOKING_REQUEST_CANCELED',
    'BOOKING_REQUEST_OFFER_CREATED',
    'BOOKING_REQUEST_OFFER_MENU_UPDATED',
    'BOOKING_REQUEST_OFFER_ACCEPTED',
    'BOOKING_REQUEST_OFFER_NOT_CHOSEN',
    'BOOKING_REQUEST_OFFER_DECLINED',
    'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED',
    'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT',
    'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER',
    'TESTIMONIAL_MEMORY_NUDGE_COOK',
    'TESTIMONIAL_REMINDER_MORNING_CUSTOMER',
    'TESTIMONIAL_REMINDER_MORNING_COOK',
    'TESTIMONIAL_REMINDER_EVENING_CUSTOMER',
    'TESTIMONIAL_REMINDER_EVENING_COOK',
    'SUPPORT_REQUEST_CREATED',
    'SUPPORT_REQUEST_MESSAGE_FROM_ADMIN',
    'SUPPORT_REQUEST_RESOLVED',
    'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER',
    'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK',
    'COOK_APPROVED_BY_ADMIN',
];

const ADMIN_OUTBOUND_EMAIL_LIFECYCLE_STATUSES: GqlCAdminOutboundEmailLifecycleStatus[] = ['FAILED', 'OPENED', 'BOUNCED', 'PENDING'];

const LIFECYCLE_STATUS_SET = new Set<string>(ADMIN_OUTBOUND_EMAIL_LIFECYCLE_STATUSES);

export type AdminOutboundEmailsSearch = {
    q?: string;
    purpose?: GqlCAdminOutboundEmailPurpose;
    lifecycleStatus?: GqlCAdminOutboundEmailLifecycleStatus;
    page?: number;
    pageSize?: AdminListPageSize;
    sort?: AdminOutboundEmailsSortField;
    dir?: 'asc' | 'desc';
};

function adminOutboundEmailsSearchForUrl(search: AdminOutboundEmailsSearch) {
    return {
        q: search.q,
        purpose: search.purpose,
        lifecycleStatus: search.lifecycleStatus,
        ...adminListPaginationForUrl(search),
        ...adminListSortSearchForUrl(search),
    };
}

export function parseAdminOutboundEmailsSearch(search: Record<string, unknown>): AdminOutboundEmailsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const purpose =
        typeof search.purpose === 'string' && ADMIN_OUTBOUND_EMAILS_ALL_PURPOSES.includes(search.purpose as GqlCAdminOutboundEmailPurpose)
            ? (search.purpose as GqlCAdminOutboundEmailPurpose)
            : undefined;
    const lifecycleStatus =
        typeof search.lifecycleStatus === 'string' && LIFECYCLE_STATUS_SET.has(search.lifecycleStatus)
            ? (search.lifecycleStatus as GqlCAdminOutboundEmailLifecycleStatus)
            : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_OUTBOUND_EMAILS_SORT_FIELDS);
    return { q, purpose, lifecycleStatus, page, pageSize, sort, dir };
}

export function adminOutboundEmailsPageVariables(search: AdminOutboundEmailsSearch) {
    return {
        criterion: {
            ...adminListSkipTake(search),
            searchText: search.q,
            purposes: search.purpose ? [search.purpose] : ADMIN_OUTBOUND_EMAILS_ALL_PURPOSES,
            lifecycleStatuses: search.lifecycleStatus ? [search.lifecycleStatus] : undefined,
            ...adminListSortToCriterion(search),
        },
    };
}

export function AdminOutboundEmailsPage({ data, search }: { data: GqlCAdminOutboundEmailsPageQuery; search: AdminOutboundEmailsSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/outbound-emails/list' });
    const admin = data.currentSession.user?.admin;
    const outboundEmails = admin?.outboundEmails ?? [];
    const total = admin?.outboundEmailsCounts[0] ?? 0;
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
            search: adminOutboundEmailsSearchForUrl({
                ...search,
                q: nextQ,
                page: undefined,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search]);

    function updateSearch(next: AdminOutboundEmailsSearch) {
        void navigate({
            search: adminOutboundEmailsSearchForUrl(next),
        });
    }

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSort = adminListSortFromSortingState(updater, sorting, ADMIN_OUTBOUND_EMAILS_SORT_FIELDS);
        updateSearch({
            ...search,
            page: undefined,
            sort: nextSort.sort,
            dir: nextSort.dir,
        });
    }

    const lifecycleTabs: { value: GqlCAdminOutboundEmailLifecycleStatus | undefined; label: string }[] = [
        { value: undefined, label: { de: 'Alle', en: 'All' }[locale] },
        ...ADMIN_OUTBOUND_EMAIL_LIFECYCLE_STATUSES.map((status) => ({
            value: status,
            label: adminOutboundEmailLifecycleStatusLabel(status, locale),
        })),
    ];

    const purposeTabs: { value: GqlCAdminOutboundEmailPurpose | undefined; label: string }[] = [
        { value: undefined, label: { de: 'Alle Zwecke', en: 'All purposes' }[locale] },
        ...ADMIN_OUTBOUND_EMAILS_ALL_PURPOSES.map((purpose) => ({
            value: purpose,
            label: adminOutboundEmailPurposeLabel(purpose, locale),
        })),
    ];

    const tableRows = outboundEmails.map((email) => ({
        outboundEmailId: email.outboundEmailId,
        purpose: email.purpose,
        toEmail: email.toEmail,
        subject: email.subject,
        createdAt: email.createdAt,
        sentAt: email.sentAt ?? null,
        failedAt: email.failedAt ?? null,
        openedAt: email.openedAt ?? null,
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
                <Tabs value={search.lifecycleStatus ?? 'all'}>
                    <TabsList variant="line" aria-label={{ de: 'Zustellstatus', en: 'Delivery status' }[locale]}>
                        {lifecycleTabs.map((tab) => (
                            <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/outbound-emails/list"
                                    search={adminOutboundEmailsSearchForUrl({
                                        ...search,
                                        lifecycleStatus: tab.value,
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

                <Tabs value={search.purpose ?? 'all'}>
                    <TabsList variant="line" aria-label={{ de: 'E-Mail-Zweck', en: 'Email purpose' }[locale]}>
                        {purposeTabs.map((tab) => (
                            <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/outbound-emails/list"
                                    search={adminOutboundEmailsSearchForUrl({
                                        ...search,
                                        purpose: tab.value,
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
                        placeholder={{ de: 'Empfänger oder Betreff suchen…', en: 'Search recipient or subject…' }[locale]}
                        aria-label={{ de: 'E-Mails suchen', en: 'Search emails' }[locale]}
                    />
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {
                            {
                                de: `${total} ${total === 1 ? 'E-Mail' : 'E-Mails'}`,
                                en: `${total} ${total === 1 ? 'email' : 'emails'}`,
                            }[locale]
                        }
                    </p>
                </div>

                <AdminOutboundEmailsDataTable data={tableRows} sorting={sorting} onSortingChange={onSortingChange} />
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
