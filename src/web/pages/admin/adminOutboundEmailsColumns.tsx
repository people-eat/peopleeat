import { createColumnHelper } from '@tanstack/react-table';

import { t } from '../../../i18n/t';
import { formatDateTime } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import type { GqlCAdminOutboundEmailLifecycleStatus, GqlCAdminOutboundEmailPurpose } from '../../graphql/generated';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';
import type { AdminOutboundEmailsDataTableFeatures } from './adminOutboundEmailsDataTableFeatures';

export type AdminOutboundEmailsTableRow = {
    outboundEmailId: string;
    purpose: GqlCAdminOutboundEmailPurpose;
    toEmail: string;
    subject: string;
    createdAt: string;
    sentAt: string | null;
    failedAt: string | null;
    openedAt: string | null;
};

export const ADMIN_OUTBOUND_EMAILS_SORT_FIELDS = ['createdAt', 'toEmail', 'subject'] as const;
export type AdminOutboundEmailsSortField = (typeof ADMIN_OUTBOUND_EMAILS_SORT_FIELDS)[number];

const columnHelper = createColumnHelper<AdminOutboundEmailsDataTableFeatures, AdminOutboundEmailsTableRow>();

export function adminOutboundEmailLifecycleStatusLabel(status: GqlCAdminOutboundEmailLifecycleStatus, locale: Locale) {
    return t(locale, 'admin', `outboundEmail.lifecycle.${status}`);
}

export function adminOutboundEmailPurposeLabel(purpose: GqlCAdminOutboundEmailPurpose, locale: Locale) {
    return t(locale, 'admin', `outboundEmail.purpose.${purpose}`);
}

/** Muted fill so category pills stay visible on the white admin table. */
export const adminOutboundEmailMetaBadgeClassName = 'bg-muted';

function formatOutboundEmailCreatedAt(value: string, locale: Locale, timeZone: string) {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' });
}

function AdminOutboundEmailStatusBadges({
    sentAt,
    failedAt,
    openedAt,
    locale,
}: {
    sentAt: string | null;
    failedAt: string | null;
    openedAt: string | null;
    locale: Locale;
}) {
    if (!sentAt && !failedAt && !openedAt) {
        return <Badge variant="outline">{t(locale, 'admin', 'copy.pending')}</Badge>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {failedAt ? <Badge variant="destructive">{t(locale, 'admin', 'copy.failed')}</Badge> : null}
            {sentAt && !failedAt ? (
                <Badge variant="outline" className={adminOutboundEmailMetaBadgeClassName}>
                    {t(locale, 'admin', 'copy.sent')}
                </Badge>
            ) : null}
            {openedAt ? <Badge>{t(locale, 'admin', 'copy.opened')}</Badge> : null}
        </div>
    );
}

export function adminOutboundEmailsColumns(locale: Locale, timeZone: string) {
    return columnHelper.columns([
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.created')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatOutboundEmailCreatedAt(row.original.createdAt, locale, timeZone)}
                </span>
            ),
        }),
        columnHelper.accessor('purpose', {
            header: () => t(locale, 'admin', 'copy.purpose'),
            cell: ({ row }) => (
                <Badge variant="outline" className={adminOutboundEmailMetaBadgeClassName}>
                    {adminOutboundEmailPurposeLabel(row.original.purpose, locale)}
                </Badge>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('toEmail', {
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.to')}</AdminDataTableSortHeader>,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.toEmail}</span>,
        }),
        columnHelper.accessor('subject', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.subject')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="line-clamp-2 font-medium text-foreground">{row.original.subject || row.original.outboundEmailId}</span>
            ),
        }),
        columnHelper.display({
            id: 'status',
            header: () => t(locale, 'admin', 'copy.status'),
            cell: ({ row }) => (
                <AdminOutboundEmailStatusBadges
                    sentAt={row.original.sentAt}
                    failedAt={row.original.failedAt}
                    openedAt={row.original.openedAt}
                    locale={locale}
                />
            ),
        }),
    ]);
}
