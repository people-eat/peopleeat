import { createColumnHelper } from '@tanstack/react-table';

import { t } from '../../../i18n/t';
import { formatDate } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import { statusBadgeToneClass } from '../../components/base/status';
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
    const labels = {
        customer: t(locale, 'admin', 'users.roles.customer'),
        cook: t(locale, 'admin', 'users.roles.cook'),
        admin: t(locale, 'admin', 'users.roles.admin'),
    } satisfies Record<GqlCAdminUserType, string>;
    return labels[type];
}

export function adminUserStatusLabel(status: GqlCUserStatus, locale: Locale) {
    const labels = {
        ACTIVE: t(locale, 'admin', 'users.accountStatus.ACTIVE'),
        BANNED: t(locale, 'admin', 'users.accountStatus.BANNED'),
        ANONYMIZED: t(locale, 'admin', 'users.accountStatus.ANONYMIZED'),
    } satisfies Record<GqlCUserStatus, string>;
    return labels[status];
}

export function adminUserStatusBadgeClassName(status: GqlCUserStatus) {
    return status === 'ACTIVE' ? statusBadgeToneClass.success : statusBadgeToneClass.error;
}

/** Muted fill so type pills stay visible on the white admin table. */
export const adminUserTypeBadgeClassName = 'bg-muted';

export function adminUsersColumns(locale: Locale, timeZone: string) {
    return columnHelper.columns([
        columnHelper.accessor('firstName', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.firstName')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="font-medium text-foreground">{row.original.firstName}</span>,
        }),
        columnHelper.accessor('lastName', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.lastName')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="font-medium text-foreground">{row.original.lastName}</span>,
        }),
        columnHelper.accessor('emailAddress', {
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.email')}</AdminDataTableSortHeader>,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.emailAddress ?? '—'}</span>,
        }),
        columnHelper.accessor('status', {
            header: () => t(locale, 'admin', 'copy.status'),
            cell: ({ row }) => (
                <Badge variant="outline" className={adminUserStatusBadgeClassName(row.original.status)}>
                    {adminUserStatusLabel(row.original.status, locale)}
                </Badge>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('types', {
            header: () => t(locale, 'admin', 'copy.type'),
            cell: ({ row }) => (
                <div className="flex w-max gap-1">
                    {row.original.types.map((type) => (
                        <Badge key={type} variant="outline" className={adminUserTypeBadgeClassName}>
                            {adminUserTypeLabel(type, locale)}
                        </Badge>
                    ))}
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.registered')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
        }),
    ]);
}
