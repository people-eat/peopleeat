import { Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { de as deLocale, enUS } from 'date-fns/locale';
import { HeadsetIcon } from 'lucide-react';

import { formatInboxListTimestamp } from '../chat/formatInboxListTimestamp';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { adminOverviewLinkCardClassName } from '../pages/admin/adminOverviewLinkCard';
import { cn } from '../utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
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

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/u).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

export function SupportRequestSummaryCard({
    request,
    unreadCount,
    customerName,
    customerProfilePictureUrl,
    to,
    params,
}: {
    request: SupportRequestSummaryCardRequest;
    unreadCount?: number;
    customerName?: string;
    customerProfilePictureUrl?: string | null;
    to: '/{-$locale}/profile/support-requests/$supportRequestId' | '/{-$locale}/admin/support-requests/$supportRequestId';
    params: { supportRequestId: string };
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const dateLocale = locale === 'de' ? deLocale : enUS;
    const statusLabel = request.status === 'RESOLVED' ? { de: 'Erledigt', en: 'Resolved' }[locale] : { de: 'Offen', en: 'Open' }[locale];
    const unread = unreadCount ?? request.userUnreadNotificationCount ?? request.adminUnreadNotificationCount ?? 0;
    const hasUnread = unread > 0;
    const customerLabel = customerName?.trim() ?? '';
    const title = customerLabel.length > 0 ? customerLabel : request.subject;
    const contextLabel = request.bookingRequest
        ? `${request.bookingRequest.occasion} · ${format(parseISO(request.bookingRequest.dateTime), 'PP', { locale: dateLocale })}`
        : { de: 'Allgemeine Anfrage', en: 'General request' }[locale];
    const preview = customerLabel.length > 0 ? request.subject : contextLabel;
    const showContextUnderTitle = customerLabel.length > 0;

    return (
        <Link to={to} params={params} className={adminOverviewLinkCardClassName('flex h-full items-center gap-3 p-3 text-foreground')}>
            <Avatar className="size-12 shrink-0">
                {customerProfilePictureUrl != null && customerProfilePictureUrl.length > 0 ? (
                    <AvatarImage src={customerProfilePictureUrl} alt="" className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-foreground/10 text-sm font-semibold text-foreground/75">
                    {customerLabel.length > 0 ? initialsFromName(customerLabel) : <HeadsetIcon className="size-5 opacity-70" aria-hidden />}
                </AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span
                    className={cn('min-w-0 truncate text-sm', hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground')}
                >
                    {title}
                </span>
                {showContextUnderTitle ? <span className="truncate text-xs text-muted-foreground">{contextLabel}</span> : null}
                <span className="truncate text-sm text-muted-foreground">{preview}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge tone={statusTone(request.status)}>{statusLabel}</StatusBadge>
                <span className={cn('text-xs tabular-nums', hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                    {formatInboxListTimestamp(request.createdAt, { locale, timeZone })}
                </span>
                <NotificationBadge
                    count={unread}
                    label={
                        {
                            de: `${unread} ungelesene Nachrichten`,
                            en: `${unread} unread messages`,
                        }[locale]
                    }
                    placement="inline"
                    className="size-5 text-[11px] shadow-none"
                />
            </span>
        </Link>
    );
}
