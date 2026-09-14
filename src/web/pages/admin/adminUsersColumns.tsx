import { createColumnHelper } from '@tanstack/react-table';

import { formatDate } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import type { GqlCAdminUserType, GqlCUserStatus } from '../../graphql/generated';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';
import type { AdminUsersDataTableFeatures } from './adminUsersDataTableFeatures';

export type AdminUsersTableRow = {
    userId: string;
    firstName: string;
    lastName: string;
    emailAddress: string | null;
    status: GqlCUserStatus;
    types: GqlCAdminUserType[];
    createdAt: string;
};

export const ADMIN_USERS_SORT_FIELDS = ['firstName', 'lastName', 'emailAddress', 'createdAt'] as const;
export type AdminUsersSortField = (typeof ADMIN_USERS_SORT_FIELDS)[number];

const columnHelper = createColumnHelper<AdminUsersDataTableFeatures, AdminUsersTableRow>();

export function adminUserTypeLabel(type: GqlCAdminUserType, locale: Locale) {
    return {
        customer: { de: 'Kunde', en: 'Customer' },
        cook: { de: 'Koch', en: 'Cook' },
        admin: { de: 'Admin', en: 'Admin' },
    }[type][locale];
}

export function adminUserStatusLabel(status: GqlCUserStatus, locale: Locale) {
    return {
        ACTIVE: { de: 'Aktiv', en: 'Active' },
        BANNED: { de: 'Gesperrt', en: 'Banned' },
        ANONYMIZED: { de: 'Anonymisiert', en: 'Anonymized' },
    }[status][locale];
}

export function adminUsersColumns(locale: Locale, timeZone: string) {
    return columnHelper.columns([
        columnHelper.accessor('firstName', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Vorname', en: 'First name' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="font-medium text-foreground">{row.original.firstName}</span>,
        }),
        columnHelper.accessor('lastName', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Nachname', en: 'Last name' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="font-medium text-foreground">{row.original.lastName}</span>,
        }),
        columnHelper.accessor('emailAddress', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'E-Mail', en: 'Email' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.emailAddress ?? '—'}</span>,
        }),
        columnHelper.accessor('status', {
            header: () => ({ de: 'Status', en: 'Status' })[locale],
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'ACTIVE' ? 'secondary' : 'destructive'}>
                    {adminUserStatusLabel(row.original.status, locale)}
                </Badge>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('types', {
            header: () => ({ de: 'Typ', en: 'Type' })[locale],
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {row.original.types.map((type) => (
                        <Badge key={type} variant="secondary">
                            {adminUserTypeLabel(type, locale)}
                        </Badge>
                    ))}
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Registriert', en: 'Registered' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
        }),
    ]);
}
