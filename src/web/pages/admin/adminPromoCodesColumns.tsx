import { createColumnHelper } from '@tanstack/react-table';

import { formatCurrency, formatDate } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';
import type { AdminPromoCodesDataTableFeatures } from './adminPromoCodesDataTableFeatures';

export type AdminPromoCodesTableRow = {
    promoCodeId: string;
    redeemCode: string;
    amountCents: number;
    minimumTotalAmountCustomerCents: number | null;
    expiresAt: string;
    createdAt: string;
};

export const ADMIN_PROMO_CODES_SORT_FIELDS = ['createdAt', 'expiresAt', 'amountCents', 'redeemCode'] as const;
export type AdminPromoCodesSortField = (typeof ADMIN_PROMO_CODES_SORT_FIELDS)[number];

const columnHelper = createColumnHelper<AdminPromoCodesDataTableFeatures, AdminPromoCodesTableRow>();

export function adminPromoCodesColumns(locale: Locale, timeZone: string) {
    return columnHelper.columns([
        columnHelper.accessor('redeemCode', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Code', en: 'Code' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="font-mono text-sm tracking-wide">{row.original.redeemCode}</span>,
        }),
        columnHelper.accessor('amountCents', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Wert', en: 'Amount' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="tabular-nums">{formatCurrency(row.original.amountCents, { locale, maximumFractionDigits: 0 })}</span>
            ),
        }),
        columnHelper.accessor('minimumTotalAmountCustomerCents', {
            header: () => ({ de: 'Mindestpreis', en: 'Minimum' })[locale],
            cell: ({ row }) => (
                <span className="tabular-nums text-muted-foreground">
                    {row.original.minimumTotalAmountCustomerCents == null
                        ? { de: 'Keiner', en: 'None' }[locale]
                        : formatCurrency(row.original.minimumTotalAmountCustomerCents, { locale, maximumFractionDigits: 0 })}
                </span>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('expiresAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Ablauf', en: 'Expires' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.expiresAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
        }),
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Erstellt', en: 'Created' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
        }),
    ]);
}
