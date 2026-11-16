import { createColumnHelper } from '@tanstack/react-table';

import { t } from '../../../i18n/t';
import { formatCurrency, formatDate } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import type { GqlCGiftCardPaymentStatus } from '../../graphql/generated';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';
import type { AdminGiftCardsDataTableFeatures } from './adminGiftCardsDataTableFeatures';

export type AdminGiftCardsTableRow = {
    giftCardId: string;
    createdAt: string;
    originalBalanceCents: number;
    paymentStatus: GqlCGiftCardPaymentStatus;
    buyerEmail: string;
    recipientName: string;
    occasion: string;
    redeemCode: string;
};

export const ADMIN_GIFT_CARDS_SORT_FIELDS = ['createdAt', 'originalBalanceCents', 'buyerEmail'] as const;
export type AdminGiftCardsSortField = (typeof ADMIN_GIFT_CARDS_SORT_FIELDS)[number];

const columnHelper = createColumnHelper<AdminGiftCardsDataTableFeatures, AdminGiftCardsTableRow>();

export function adminGiftCardPaymentStatusLabel(status: GqlCGiftCardPaymentStatus, locale: Locale) {
    const labels = {
        PREPARED: t(locale, 'admin', 'giftCards.status.PREPARED'),
        PAYED: t(locale, 'admin', 'giftCards.status.PAYED'),
    } satisfies Record<GqlCGiftCardPaymentStatus, string>;
    return labels[status];
}

export function adminGiftCardsColumns(locale: Locale, timeZone: string) {
    return columnHelper.columns([
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.created')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
        }),
        columnHelper.accessor('originalBalanceCents', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.amount3')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.originalBalanceCents, { locale })}</span>,
        }),
        columnHelper.accessor('paymentStatus', {
            header: () => t(locale, 'admin', 'copy.status'),
            cell: ({ row }) => (
                <Badge variant={row.original.paymentStatus === 'PAYED' ? 'default' : 'secondary'}>
                    {adminGiftCardPaymentStatusLabel(row.original.paymentStatus, locale)}
                </Badge>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('buyerEmail', {
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.buyer')}</AdminDataTableSortHeader>,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.buyerEmail}</span>,
        }),
        columnHelper.accessor('recipientName', {
            id: 'recipient',
            header: () => t(locale, 'admin', 'copy.recipient'),
            cell: ({ row }) => <span>{row.original.recipientName}</span>,
            enableSorting: false,
        }),
        columnHelper.accessor('occasion', {
            header: () => t(locale, 'admin', 'copy.occasion'),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.occasion}</span>,
            enableSorting: false,
        }),
        columnHelper.accessor('redeemCode', {
            header: () => t(locale, 'admin', 'copy.code'),
            cell: ({ row }) => <span className="font-mono text-sm tracking-wide">{row.original.redeemCode}</span>,
            enableSorting: false,
        }),
    ]);
}
