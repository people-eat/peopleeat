import type { ReactNode } from 'react';

import { formatDateTime } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import {
    adminQueuedJobDataDetail,
    adminQueuedJobDescription,
    adminQueuedJobNameLabel,
    adminQueuedJobStateLabel,
    adminQueuedJobStateTone,
} from '../pages/admin/adminQueuedJobLabels';
import type { Locale } from '../utils/locale';
import { Badge } from './base/badge';
import { StatusBadge } from './base/status-badge';

export type AdminQueuedJobRow = {
    jobId: string;
    name: string;
    state: 'CREATED' | 'RETRY' | 'ACTIVE';
    startAfter: string;
    createdOn: string;
    data: unknown;
};

function formatJobDue(value: string, locale: Locale, timeZone: string): string {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short', nullAs: value });
}

function bookingRequestOfferIdFromQueuedJobData(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;
    const id = (data as Record<string, unknown>).bookingRequestOfferId;
    return typeof id === 'string' ? id : null;
}

export function AdminQueuedJobsSection({
    jobs,
    emptyMessage,
    offerLink,
}: {
    readonly jobs: readonly AdminQueuedJobRow[];
    readonly emptyMessage?: Record<Locale, string>;
    /** When set, jobs with `bookingRequestOfferId` in data render an offer link. */
    readonly offerLink?: (bookingRequestOfferId: string) => ReactNode;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    if (jobs.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {
                    (emptyMessage ?? {
                        de: 'Keine ausstehenden Jobs für dieses Angebot.',
                        en: 'No pending jobs for this offer.',
                    })[locale]
                }
            </p>
        );
    }

    return (
        <div className="grid gap-3">
            <h2 className="text-sm font-medium text-foreground">{{ de: 'Geplante Jobs', en: 'Queued jobs' }[locale]}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-secondary">
                {jobs.map((job) => {
                    const detail = adminQueuedJobDataDetail(job.data, locale);
                    const description = adminQueuedJobDescription(job.name, locale);
                    const offerId = bookingRequestOfferIdFromQueuedJobData(job.data);
                    return (
                        <li key={job.jobId} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-foreground">{adminQueuedJobNameLabel(job.name, locale)}</span>
                                    <StatusBadge tone={adminQueuedJobStateTone(job.state)}>
                                        {adminQueuedJobStateLabel(job.state, locale)}
                                    </StatusBadge>
                                    {detail ? (
                                        <Badge variant="outline" className="font-normal">
                                            {detail}
                                        </Badge>
                                    ) : null}
                                </div>
                                {description ? <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
                                {offerLink && offerId ? <div className="text-xs">{offerLink(offerId)}</div> : null}
                            </div>
                            <p className="text-xs text-muted-foreground sm:text-right">
                                <span className="block sm:mb-0.5">{{ de: 'Fällig', en: 'Due' }[locale]}</span>
                                <span className="tabular-nums text-sm text-foreground">
                                    {formatJobDue(job.startAfter, locale, timeZone)}
                                </span>
                            </p>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
