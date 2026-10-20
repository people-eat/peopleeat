import { Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { de as deLocale, enUS } from 'date-fns/locale';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { NotificationBadge } from './base/notification-badge';
import { StatusBadge } from './base/status-badge';

export type SupportRequestSummaryCardRequest = {
    supportRequestId: string;
    subject: string;
    status: 'OPEN' | 'RESOLVED' | string;
    userUnreadNotificationCount?: number;
    adminUnreadNotificationCount?: number;
    createdAt: string;
    bookingRequest?: {
        bookingRequestId: string;
        occasion: string;
        dateTime: string;
    } | null;
};

function statusTone(status: string): 'success' | 'warning' | 'info' {
    if (status === 'RESOLVED') return 'success';
    if (status === 'OPEN') return 'warning';
    return 'info';
}

export function SupportRequestSummaryCard({
    request,
    unreadCount,
    customerName,
    to,
    params,
}: {
    request: SupportRequestSummaryCardRequest;
    unreadCount?: number;
    customerName?: string;
    to: '/{-$locale}/profile/support-requests/$supportRequestId' | '/{-$locale}/admin/support-requests/$supportRequestId';
    params: { supportRequestId: string };
}) {
    const locale = useLocale();
    const dateLocale = locale === 'de' ? deLocale : enUS;
    const statusLabel = request.status === 'RESOLVED' ? { de: 'Erledigt', en: 'Resolved' }[locale] : { de: 'Offen', en: 'Open' }[locale];
    const createdLabel = format(parseISO(request.createdAt), 'PP', { locale: dateLocale });
    const unread = unreadCount ?? request.userUnreadNotificationCount ?? request.adminUnreadNotificationCount ?? 0;
    const customerLabel = customerName?.trim() ?? '';

    return (
        <Link
            to={to}
            params={params}
            className={cn(
                'relative flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm transition hover:border-muted-foreground/40',
            )}
        >
            <NotificationBadge
                count={unread}
                label={
                    {
                        de: `${unread} ungelesene Nachrichten`,
                        en: `${unread} unread messages`,
                    }[locale]
                }
            />
            <div className="grid min-h-0 flex-1 content-start gap-2 pr-6">
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(request.status)}>{statusLabel}</StatusBadge>
                    <span className="text-xs text-muted-foreground">{createdLabel}</span>
                </div>
                <p className="line-clamp-2 font-medium text-foreground">{request.subject}</p>
                {customerLabel.length > 0 ? <p className="truncate text-sm text-muted-foreground">{customerLabel}</p> : null}
                {request.bookingRequest ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                        {request.bookingRequest.occasion}
                        {' · '}
                        {format(parseISO(request.bookingRequest.dateTime), 'PP', { locale: dateLocale })}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">{{ de: 'Allgemeine Anfrage', en: 'General request' }[locale]}</p>
                )}
            </div>
        </Link>
    );
}
