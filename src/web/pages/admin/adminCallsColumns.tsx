import { createColumnHelper } from '@tanstack/react-table';

import { t } from '../../../i18n/t';
import { formatDate } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import type { GqlCAdminCallListItemKind, GqlCCookCallSlotBookingActor } from '../../graphql/generated';
import { adminCallKindLabel } from './AdminCallsAttentionBoard';
import type { AdminCallsDataTableFeatures } from './adminCallsDataTableFeatures';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';

export type AdminCallsTableRow = {
    kind: GqlCAdminCallListItemKind;
    bookingRequestId: string;
    bookingRequestOfferId: string;
    /** Present for LIVE / RECENT_ROOM, or slots that already opened a room. */
    bookingRequestOfferCallRoomId: string | null;
    cookDisplayName: string;
    customerDisplayName: string;
    occasion: string;
    occurredAt: string;
    initiator: GqlCCookCallSlotBookingActor | null;
    reason: string | null;
};

export const ADMIN_CALLS_SORT_FIELDS = ['occurredAt', 'createdAt'] as const;
export type AdminCallsSortField = (typeof ADMIN_CALLS_SORT_FIELDS)[number];

const columnHelper = createColumnHelper<AdminCallsDataTableFeatures, AdminCallsTableRow>();

export function adminCallInitiatorLabel(initiator: GqlCCookCallSlotBookingActor, locale: Locale): string {
    return t(locale, 'admin', `calls.parties.${initiator}`);
}

export function adminCallsColumns(locale: Locale, timeZone: string) {
    return columnHelper.columns([
        columnHelper.accessor('occasion', {
            header: () => t(locale, 'admin', 'copy.occasion'),
            cell: ({ row }) => <span className="font-medium text-foreground">{row.original.occasion || '—'}</span>,
            enableSorting: false,
        }),
        columnHelper.accessor('kind', {
            header: () => t(locale, 'admin', 'copy.status'),
            cell: ({ row }) => (
                <Badge variant={row.original.kind === 'LIVE' || row.original.kind === 'PENDING' ? 'default' : 'outline'}>
                    {adminCallKindLabel(row.original.kind, locale)}
                </Badge>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('cookDisplayName', {
            header: () => t(locale, 'admin', 'copy.cook'),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.cookDisplayName}</span>,
            enableSorting: false,
        }),
        columnHelper.accessor('customerDisplayName', {
            header: () => t(locale, 'admin', 'copy.customer'),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.customerDisplayName}</span>,
            enableSorting: false,
        }),
        columnHelper.accessor('initiator', {
            header: () => t(locale, 'admin', 'copy.initiator'),
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {row.original.initiator ? adminCallInitiatorLabel(row.original.initiator, locale) : '—'}
                </span>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('occurredAt', {
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.when')}</AdminDataTableSortHeader>,
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.occurredAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
        }),
        columnHelper.accessor('reason', {
            header: () => t(locale, 'admin', 'copy.reason2'),
            cell: ({ row }) => (
                <span className="max-w-[16rem] truncate text-muted-foreground" title={row.original.reason ?? undefined}>
                    {row.original.reason || '—'}
                </span>
            ),
            enableSorting: false,
        }),
    ]);
}
