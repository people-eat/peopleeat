import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
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
} from '../../components/base/alert-dialog';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
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
                <Button asChild variant="outline" size="sm">
                    <Link
                        to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                        params={{
                            bookingRequestId: job.bookingRequestId,
                            bookingRequestOfferId: job.bookingRequestOfferId,
                        }}
                    >
                        {t(locale, 'admin', 'copy.viewOffer')}
                    </Link>
                </Button>
            ),
        });
    } else if (job.bookingRequestId) {
        links.push({
            key: 'request',
            node: (
                <Button asChild variant="outline" size="sm">
                    <Link
                        to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                        params={{ bookingRequestId: job.bookingRequestId }}
                    >
                        {t(locale, 'admin', 'copy.viewRequest')}
                    </Link>
                </Button>
            ),
        });
    }

    if (job.giftCardId) {
        links.push({
            key: 'gift-card',
            node: (
                <Button asChild variant="outline" size="sm">
                    <Link to="/{-$locale}/admin/gift-cards/$giftCardId" params={{ giftCardId: job.giftCardId }}>
                        {t(locale, 'admin', 'copy.viewGiftCard')}
                    </Link>
                </Button>
            ),
        });
    }

    if (job.supportRequestId) {
        links.push({
            key: 'support',
            node: (
                <Button asChild variant="outline" size="sm">
                    <Link
                        to="/{-$locale}/admin/support-requests/$supportRequestId"
                        params={{ supportRequestId: job.supportRequestId }}
                    >
                        {t(locale, 'admin', 'copy.viewSupport')}
                    </Link>
                </Button>
            ),
        });
    }

    if (job.chatId) {
        links.push({
            key: 'chat',
            node: (
                <Button asChild variant="outline" size="sm">
                    <Link to="/{-$locale}/admin/assistant-chats/$chatId" params={{ chatId: job.chatId }}>
                        {t(locale, 'admin', 'copy.viewChat')}
                    </Link>
                </Button>
            ),
        });
    }

    const userId = job.userId ?? job.cookId;
    if (userId) {
        links.push({
            key: 'user',
            node: (
                <Button asChild variant="outline" size="sm">
                    <Link to="/{-$locale}/admin/users/$userId" params={{ userId }}>
                        {t(locale, 'admin', 'copy.viewUser')}
                    </Link>
                </Button>
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
    const [cancelConfirmJob, setCancelConfirmJob] = useState<AdminJobsRow | null>(null);
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
                                            className="grid gap-3 px-4 py-3 @md:grid-cols-[minmax(0,1fr)_auto] @md:items-center @md:gap-6"
                                        >
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap @md:items-center">
                                                    <span className="font-medium text-foreground">
                                                        {adminQueuedJobNameLabel(job.name, locale)}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <StatusBadge tone={adminQueuedJobStateTone(job.state)}>
                                                            {adminQueuedJobStateLabel(job.state, locale)}
                                                        </StatusBadge>
                                                        {detail ? (
                                                            <Badge variant="outline" className="font-normal">
                                                                {detail}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                {description ? (
                                                    <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
                                                ) : null}
                                            </div>
                                            <div className="flex items-center justify-between gap-3 @md:flex-col @md:items-end @md:justify-start @md:gap-2">
                                                <p className="tabular-nums text-sm text-foreground @md:text-right">
                                                    {formatJobDue(job.startAfter, locale, timeZone)}
                                                </p>
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                disabled={busy}
                                                                aria-label={t(locale, 'admin', 'copy.moreActions')}
                                                            >
                                                                <MoreHorizontalIcon className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                disabled={busy}
                                                                onSelect={() => setCancelConfirmJob(job)}
                                                            >
                                                                {t(locale, 'admin', 'copy.cancel')}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    {relatedLinks.map((link) => (
                                                        <span key={link.key}>{link.node}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                )}
            </AdminPinnedFooterLayout>

            <AlertDialog open={cancelConfirmJob != null} onOpenChange={(open) => !open && setCancelConfirmJob(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'admin', 'copy.cancelThisJob')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(locale, 'admin', 'copy.theScheduledJobWillNotRunWorkThatAlreadyStartedCannotBeUndon')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={cancellingJobId != null}>{t(locale, 'admin', 'copy.back2')}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={cancellingJobId != null || cancelConfirmJob == null}
                            onClick={() => {
                                if (cancelConfirmJob == null) return;
                                void onCancelJob(cancelConfirmJob).then(() => setCancelConfirmJob(null));
                            }}
                        >
                            {t(locale, 'admin', 'copy.cancelJob')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPathPageChrome>
    );
}
