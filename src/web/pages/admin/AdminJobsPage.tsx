import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatDateTime } from '../../../shared';
import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../../components/base/alert-dialog';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { StatusBadge } from '../../components/base/status-badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminJobsPageQuery } from '../../graphql/generated';
import { AdminQueuedJobCancelDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { adminStubRouteBySlug, adminStubRouteDescription, adminStubRouteTitle } from './adminCatalog';
import {
    adminListPageCount,
    adminListPageSize,
    adminListPaginationForUrl,
    parseAdminListPage,
    parseAdminListPageSize,
} from './adminListPaginationSearch';
import type { AdminListPageSize } from './adminListPaginationSearch';
import {
    adminQueuedJobDataDetail,
    adminQueuedJobDescription,
    adminQueuedJobNameLabel,
    adminQueuedJobStateLabel,
    adminQueuedJobStateTone,
} from './adminQueuedJobLabels';

const route = adminStubRouteBySlug('jobs');

export function adminJobsPageTitle(locale: Locale): string {
    return adminStubRouteTitle(route.slug, locale);
}
export function adminJobsPageDescription(locale: Locale): string {
    return adminStubRouteDescription(route.slug, locale);
}

export type AdminJobsSearch = {
    page?: number;
    pageSize?: AdminListPageSize;
};

export function parseAdminJobsSearch(search: Record<string, unknown>): AdminJobsSearch {
    return {
        page: parseAdminListPage(search),
        pageSize: parseAdminListPageSize(search),
    };
}

function adminJobsSearchForUrl(search: AdminJobsSearch) {
    return adminListPaginationForUrl(search);
}

type AdminJobsRow = NonNullable<NonNullable<NonNullable<GqlCAdminJobsPageQuery['currentSession']['user']>['admin']>['queuedJobs']>[number];

function formatJobDue(value: string, locale: Locale, timeZone: string): string {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short', nullAs: value });
}

function jobRelatedLinks(job: AdminJobsRow, locale: Locale): { key: string; node: ReactNode }[] {
    const links: { key: string; node: ReactNode }[] = [];

    if (job.bookingRequestId && job.bookingRequestOfferId) {
        links.push({
            key: 'offer',
            node: (
                <Link
                    to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                    params={{
                        bookingRequestId: job.bookingRequestId,
                        bookingRequestOfferId: job.bookingRequestOfferId,
                    }}
                    className="font-medium text-foreground hover:underline"
                >
                    {t(locale, 'admin', 'copy.viewOffer')}
                </Link>
            ),
        });
    } else if (job.bookingRequestId) {
        links.push({
            key: 'request',
            node: (
                <Link
                    to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                    params={{ bookingRequestId: job.bookingRequestId }}
                    className="font-medium text-foreground hover:underline"
                >
                    {t(locale, 'admin', 'copy.viewRequest')}
                </Link>
            ),
        });
    }

    if (job.giftCardId) {
        links.push({
            key: 'gift-card',
            node: (
                <Link
                    to="/{-$locale}/admin/gift-cards/$giftCardId"
                    params={{ giftCardId: job.giftCardId }}
                    className="font-medium text-foreground hover:underline"
                >
                    {t(locale, 'admin', 'copy.viewGiftCard')}
                </Link>
            ),
        });
    }

    if (job.supportRequestId) {
        links.push({
            key: 'support',
            node: (
                <Link
                    to="/{-$locale}/admin/support-requests/$supportRequestId"
                    params={{ supportRequestId: job.supportRequestId }}
                    className="font-medium text-foreground hover:underline"
                >
                    {t(locale, 'admin', 'copy.viewSupport')}
                </Link>
            ),
        });
    }

    if (job.chatId) {
        links.push({
            key: 'chat',
            node: (
                <Link
                    to="/{-$locale}/admin/assistant-chats/$chatId"
                    params={{ chatId: job.chatId }}
                    className="font-medium text-foreground hover:underline"
                >
                    {t(locale, 'admin', 'copy.viewChat')}
                </Link>
            ),
        });
    }

    const userId = job.userId ?? job.cookId;
    if (userId) {
        links.push({
            key: 'user',
            node: (
                <Link to="/{-$locale}/admin/users/$userId" params={{ userId }} className="font-medium text-foreground hover:underline">
                    {t(locale, 'admin', 'copy.viewUser')}
                </Link>
            ),
        });
    }

    return links;
}

export function AdminJobsPage({ data, search }: { data: GqlCAdminJobsPageQuery; search: AdminJobsSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const router = useRouter();
    const navigate = useNavigate({ from: '/{-$locale}/admin/jobs' });
    const jobs = data.currentSession.user?.admin?.queuedJobs ?? [];
    const [nameFilter, setNameFilter] = useState<string | undefined>(undefined);
    const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
    const [, queuedJobCancel] = useMutation(AdminQueuedJobCancelDocument);

    const nameTabs = useMemo(() => {
        const names = [...new Set(jobs.map((job) => job.name))].sort((a, b) =>
            adminQueuedJobNameLabel(a, locale).localeCompare(adminQueuedJobNameLabel(b, locale), locale),
        );
        return [
            { value: undefined as string | undefined, label: t(locale, 'admin', 'copy.all') },
            ...names.map((name) => ({ value: name, label: adminQueuedJobNameLabel(name, locale) })),
        ];
    }, [jobs, locale]);

    const filteredJobs = nameFilter ? jobs.filter((job) => job.name === nameFilter) : jobs;
    const total = filteredJobs.length;
    const pageSize = adminListPageSize(search);
    const pageCount = adminListPageCount(total, pageSize);
    const page = Math.min(search.page ?? 1, pageCount);
    const pageJobs = filteredJobs.slice((page - 1) * pageSize, page * pageSize);

    function updateSearch(next: AdminJobsSearch) {
        void navigate({
            search: adminJobsSearchForUrl(next),
        });
    }

    function onNameFilterChange(value: string) {
        setNameFilter(value === 'all' ? undefined : value);
        updateSearch({ ...search, page: undefined });
    }

    async function onCancelJob(job: AdminJobsRow) {
        setCancellingJobId(job.jobId);
        try {
            const result = await queuedJobCancel({ jobId: job.jobId, name: job.name });
            if (result.error || !result.data?.admin.queuedJobCancel.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotCancelTheJob'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.jobCancelled'));
            await router.invalidate();
        } finally {
            setCancellingJobId(null);
        }
    }

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
                <div>
                    <h1 className="text-2xl font-medium">{adminJobsPageTitle(locale)}</h1>
                    <p className="text-sm text-muted-foreground">{adminJobsPageDescription(locale)}</p>
                </div>

                {jobs.length > 0 ? (
                    <Tabs value={nameFilter ?? 'all'} onValueChange={onNameFilterChange}>
                        <TabsList variant="line" aria-label={t(locale, 'admin', 'copy.filterByJobType')}>
                            {nameTabs.map((tab) => (
                                <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'}>
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                ) : null}

                {pageJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noPendingScheduledJobs')}</p>
                ) : (
                    <div>
                        <div className="overflow-hidden rounded-xl border border-border bg-secondary">
                            <ul className="divide-y divide-border">
                                {pageJobs.map((job) => {
                                    const detail = adminQueuedJobDataDetail(job.data, locale);
                                    const description = adminQueuedJobDescription(job.name, locale);
                                    const relatedLinks = jobRelatedLinks(job, locale);
                                    const busy = cancellingJobId === job.jobId;
                                    return (
                                        <li
                                            key={job.jobId}
                                            className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6"
                                        >
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-foreground">
                                                        {adminQueuedJobNameLabel(job.name, locale)}
                                                    </span>
                                                    <StatusBadge tone={adminQueuedJobStateTone(job.state)}>
                                                        {adminQueuedJobStateLabel(job.state, locale)}
                                                    </StatusBadge>
                                                    {detail ? (
                                                        <Badge variant="outline" className="font-normal">
                                                            {detail}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                {description ? (
                                                    <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
                                                ) : null}
                                                {relatedLinks.length > 0 ? (
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                                        {relatedLinks.map((link) => (
                                                            <span key={link.key}>{link.node}</span>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                                                <p className="text-xs text-muted-foreground sm:text-right">
                                                    <span className="block sm:mb-0.5">{t(locale, 'admin', 'copy.due')}</span>
                                                    <span className="tabular-nums text-sm text-foreground">
                                                        {formatJobDue(job.startAfter, locale, timeZone)}
                                                    </span>
                                                </p>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button type="button" variant="outline" size="sm" disabled={busy}>
                                                            {t(locale, 'admin', 'copy.cancel')}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t(locale, 'admin', 'copy.cancelThisJob')}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t(
                                                                    locale,
                                                                    'admin',
                                                                    'copy.theScheduledJobWillNotRunWorkThatAlreadyStartedCannotBeUndon',
                                                                )}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel disabled={busy}>
                                                                {t(locale, 'admin', 'copy.back2')}
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                variant="destructive"
                                                                disabled={busy}
                                                                onClick={() => void onCancelJob(job)}
                                                            >
                                                                {t(locale, 'admin', 'copy.cancelJob')}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                )}
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
